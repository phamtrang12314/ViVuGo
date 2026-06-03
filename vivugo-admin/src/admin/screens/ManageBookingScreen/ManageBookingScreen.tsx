import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { omitBy, isUndefined } from 'lodash'
import { Eye, RefreshCw, XCircle, ListFilter } from 'lucide-react'

import type { BookingAdmin, BookingAdminListParams } from '../../types/bookingAdmin'
import type { BookingStatus } from '@/types/booking.type'
import type { PaymentStatus } from '@/admin/types/paymentStatus'
import { bookingAdminApi } from '../../apis/bookingAdmin.api'
import { subscribeBookingRealtime } from '@/utils/realtime'

// helper
const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })

type ParsedBookingParams = {
  page: number
  size: number
  search?: string
  status?: BookingStatus
  sort?: BookingAdminListParams['sort']
  fromDate?: string
  toDate?: string
}

// const parseSearchParams = (sp: URLSearchParams): ParsedBookingParams => {
//   const today = new Date();
//   const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

//   const page = sp.get("page") ? Number(sp.get("page")) : 0;
//   const size = sp.get("size") ? Number(sp.get("size")) : 10;

//   const search = sp.get("search") || undefined;
//   const status = (sp.get("status") || undefined) as BookingStatus | undefined;
//   const sort = (sp.get("sort") || undefined) as
//     | BookingAdminListParams["sort"]
//     | undefined;

//   const fromDate = sp.get("fromDate") || toDateInputValue(firstOfMonth);
//   const toDate = sp.get("toDate") || toDateInputValue(today);

//   const params: ParsedBookingParams = {
//     page,
//     size,
//     search,
//     status,
//     sort,
//     fromDate,
//     toDate,
//   };

//   return omitBy(params, isUndefined) as ParsedBookingParams;
// };

const parseSearchParams = (sp: URLSearchParams): ParsedBookingParams => {
  const page = sp.get('page') ? Number(sp.get('page')) : 0
  const size = sp.get('size') ? Number(sp.get('size')) : 10

  const search = sp.get('search') || undefined
  const status = (sp.get('status') || undefined) as BookingStatus | undefined
  const sort = (sp.get('sort') || undefined) as BookingAdminListParams['sort'] | undefined

  const fromDate = sp.get('fromDate') || undefined
  const toDate = sp.get('toDate') || undefined

  const params: ParsedBookingParams = {
    page,
    size,
    search,
    status,
    sort,
    fromDate,
    toDate
  }

  return omitBy(params, isUndefined) as ParsedBookingParams
}

const statusLabelMap: Record<BookingStatus, string> = {
  PROCESSING: 'Đang xử lý',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELED: 'Đã hủy',
  CANCELLATION_REQUESTED: 'Chờ duyệt hủy'
}

const statusBadgeClassMap: Record<BookingStatus, string> = {
  PROCESSING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  CONFIRMED: 'bg-green-50 text-green-700 border border-green-200',
  COMPLETED: 'bg-blue-50 text-blue-700 border border-blue-200',
  CANCELED: 'bg-red-50 text-red-600 border border-red-200',
  CANCELLATION_REQUESTED: 'bg-red-50 text-red-600 border border-red-200'
}

const paymentLabelMap: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thanh toán lỗi'
}

const paymentBadgeClassMap: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  SUCCESS: 'bg-green-50 text-green-700 border border-green-200',
  FAILED: 'bg-red-50 text-red-600 border border-red-200'
}

const ManageBookingScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParams = parseSearchParams(searchParams)
  const navigate = useNavigate()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-bookings', queryParams],
    queryFn: () =>
      bookingAdminApi
        .getAdminBookings(queryParams as BookingAdminListParams)
        .then((res) => res.data),
    placeholderData: keepPreviousData
  })

  const bookings: BookingAdmin[] = data?.content || []
  const totalPages = data?.totalPages || 0
  const currentPage = data?.number ?? 0

  const { data: stats } = useQuery({
    queryKey: [
      'admin-bookings-stats',
      { fromDate: queryParams.fromDate, toDate: queryParams.toDate }
    ],
    queryFn: () =>
      bookingAdminApi
        .getBookingStats({
          fromDate: queryParams.fromDate,
          toDate: queryParams.toDate
        })
        .then((res) => res.data)
  })

  React.useEffect(() => {
    return subscribeBookingRealtime((event) => {
      if (
        event.type === 'BOOKING_CREATED' ||
        event.type === 'BOOKING_CANCEL_REQUESTED' ||
        event.type === 'BOOKING_STATUS_CHANGED' ||
        event.type === 'PAYMENT_CONFIRMED'
      ) {
        refetch()
      }
    })
  }, [refetch])

  const updateParams = (patch: Partial<ParsedBookingParams>) => {
    const merged = omitBy(
      {
        ...queryParams,
        ...patch
      },
      (v) => v === undefined || v === ''
    )
    setSearchParams(merged as any)
  }

  const handlePageChange = (page: number) => {
    updateParams({ page })
  }

  const handleRefresh = () => {
    updateParams({
      page: 0,
      fromDate: '', // sẽ bị xóa khỏi URL
      toDate: '' // sẽ bị xóa khỏi URL
    })
  }

  const handleGetCustomerByTour = async () => {
    navigate('/admin/manage-booking/tour-participants')
  }

  const handleProcessCancel = async () => {
    navigate('/admin/manage-booking/canceled')
  }

  const handleViewBooking = (id: string) => {
    navigate(`/admin/manage-booking/detail/${id}`)
  }

  const applyStatusFilter = (status?: BookingStatus) => {
    updateParams({
      status,
      page: 0
    })
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header + buttons */}
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Booking</h1>
          <p className="text-gray-500 text-sm">Theo dõi và xử lý tất cả đơn đặt tour</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGetCustomerByTour}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500 text-blue-600 text-sm font-medium bg-white hover:bg-blue-50 transition"
          >
            <ListFilter size={16} />
            Xem khách theo tour
          </button>

          <button
            onClick={handleProcessCancel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500 text-red-600 text-sm font-medium bg-white hover:bg-red-50 transition"
          >
            <XCircle size={16} />
            Xử lý hủy booking
          </button>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition"
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
        </div>
      </div>
      {/* Stat cards */}
      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <button
          onClick={() => applyStatusFilter(undefined)}
          className={`flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-left shadow-sm ${
            !queryParams.status ? 'border-blue-300 ring-2 ring-blue-100' : 'border-transparent'
          }`}
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-700'>
            {stats?.total ?? 0}
          </div>
          <div className='text-xs text-gray-500'>Tổng booking</div>
        </button>

        <button
          onClick={() => applyStatusFilter('PROCESSING')}
          className={`flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-left shadow-sm ${
            queryParams.status === 'PROCESSING' ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-transparent'
          }`}
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 text-lg font-bold text-yellow-600'>
            {stats?.processing ?? 0}
          </div>
          <div className='text-xs text-gray-500'>Đang xử lý</div>
        </button>

        <button
          onClick={() => applyStatusFilter('CONFIRMED')}
          className={`flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-left shadow-sm ${
            queryParams.status === 'CONFIRMED' ? 'border-green-300 ring-2 ring-green-100' : 'border-transparent'
          }`}
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-lg font-bold text-green-600'>
            {stats?.confirmed ?? 0}
          </div>
          <div className='text-xs text-gray-500'>Đã xác nhận</div>
        </button>

        <button
          onClick={() => applyStatusFilter('COMPLETED')}
          className={`flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-left shadow-sm ${
            queryParams.status === 'COMPLETED' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-transparent'
          }`}
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600'>
            {stats?.completed ?? 0}
          </div>
          <div className='text-xs text-gray-500'>Hoàn thành</div>
        </button>
      </div>
      {/* Filter bar */}
      {/* Khung 1: Tìm kiếm + trạng thái + sắp xếp */}
      <div className="bg-white shadow-md rounded-xl p-5 flex flex-wrap items-center gap-4 mb-4">
        {/* <input
          type="text"
          placeholder="Tìm kiếm theo mã booking, tên khách hàng hoặc tour..."
          value={queryParams.search || ""} 
          defaultValue={""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({
                search: e.currentTarget.value || undefined,
                page: 0,
              });
            }
          }}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full lg:flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        /> */}
        <input
          type="text"
          placeholder="Tìm kiếm theo mã booking, tên khách hàng hoặc tour..."
          value={queryParams.search || ''} // controlled input
          onChange={(e) => {
            updateParams({
              search: e.target.value || undefined,
              page: 0
            })
          }}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full lg:flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* status */}
        <select
          className="border border-gray-300 rounded-lg px-4 py-2 min-w-[180px] text-sm"
          value={queryParams.status || ''}
          onChange={(e) =>
            updateParams({
              status: (e.target.value || undefined) as BookingStatus | undefined,
              page: 0
            })
          }
        >
          <option value="">Tất cả trạng thái</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELED">Đã hủy</option>
        </select>

        {/* sort */}
        <select
          className="border border-gray-300 rounded-lg px-4 py-2 min-w-[180px] text-sm"
          value={queryParams.sort || ''}
          onChange={(e) =>
            updateParams({
              sort: (e.target.value || undefined) as BookingAdminListParams['sort'] | undefined,
              page: 0
            })
          }
        >
          <option value="">Sắp xếp theo</option>
          <option value="newest">Ngày đặt mới nhất</option>
          <option value="oldest">Ngày đặt cũ nhất</option>
          <option value="priceDesc">Giá cao nhất</option>
          <option value="priceAsc">Giá thấp nhất</option>
        </select>
      </div>

      {/* Khung 2: Khoảng thời gian */}
      <div className="bg-white shadow-md rounded-xl p-5 flex flex-wrap items-center gap-4 mb-6 text-xs text-gray-500">
        <div className="flex flex-col">
          <span className="mb-1">Từ ngày</span>

          <input
            type="date"
            value={queryParams.fromDate || ''} // <- thêm || ""
            onChange={(e) => updateParams({ fromDate: e.target.value || undefined, page: 0 })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col">
          <span className="mb-1">Đến ngày</span>

          <input
            type="date"
            value={queryParams.toDate || ''}
            onChange={(e) => updateParams({ toDate: e.target.value || undefined, page: 0 })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200 text-gray-600 text-xs uppercase border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 font-semibold text-black">Khách hàng</th>
              <th className="px-5 py-3 font-semibold text-black">Tour</th>
              <th className="px-5 py-3 font-semibold text-black">Ngày khởi hành</th>
              <th className="px-5 py-3 font-semibold text-black">Giá</th>
              <th className="px-5 py-3 font-semibold text-black">Trạng thái</th>
              <th className="px-5 py-3 font-semibold text-black">Thanh toán</th>
              <th className="px-5 py-3 font-semibold text-black text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-gray-800 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  Không có booking phù hợp.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr
                  key={b.bookingID}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                >
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 text-sm">{b.customerName}</span>
                      <span className="text-xs text-gray-500">{b.numGuests} khách</span>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top max-w-xs">
                    <span
                      className="block max-w-[220px] truncate text-sm font-medium text-gray-900"
                      title={b.tourName}
                    >
                      {b.tourName}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    {b.departureDate ? new Date(b.departureDate).toLocaleDateString('vi-VN') : '-'}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span className="text-blue-600 font-semibold">
                      {formatCurrency(b.finalAmount)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        statusBadgeClassMap[b.status]
                      }`}
                    >
                      {statusLabelMap[b.status]}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        paymentBadgeClassMap[b.paymentStatus]
                      }`}
                    >
                      {paymentLabelMap[b.paymentStatus]}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top text-center">
                    <button
                      type="button"
                      onClick={() => handleViewBooking(b.bookingID)}
                      className="border border-blue-500 text-blue-500 rounded-lg p-2 hover:bg-blue-50 inline-flex items-center justify-center"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
          >
            ←
          </button>

          <span className="text-gray-700 font-medium text-sm">
            Trang {currentPage + 1} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage + 1 >= totalPages}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}

export default ManageBookingScreen


