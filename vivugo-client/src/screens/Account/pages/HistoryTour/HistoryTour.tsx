import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCalendarAlt, FaUsers } from 'react-icons/fa'
import { bookingApi } from '../../../../apis/booking.api'
import { formatCurrency, resolveAssetUrl } from '../../../../utils/utils'
import { ReviewButton } from '../../../../components/ReviewButton/ReviewButton'
import { Button } from '../../../../components/ui/button'
import type { BookingHistoryResponse } from '../../../../types/booking.type'

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { classes: string; text: string }> = {
    COMPLETED: { classes: 'bg-green-100 text-green-700', text: 'Hoàn thành' },
    CONFIRMED: { classes: 'bg-blue-100 text-blue-700', text: 'Đã xác nhận' },
    PROCESSING: { classes: 'bg-yellow-100 text-yellow-700', text: 'Đang chờ thanh toán' },
    CANCELED: { classes: 'bg-red-100 text-red-700', text: 'Đã hủy' },
    CANCELLATION_REQUESTED: { classes: 'bg-orange-100 text-orange-700', text: 'Chờ duyệt hủy' }
  }

  const item = config[status] || { classes: 'bg-gray-100 text-gray-500', text: 'Không rõ' }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.classes}`}>{item.text}</span>
}

const PaymentBadge = ({ status }: { status?: string }) => {
  if (status === 'SUCCESS') {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Đã thanh toán</span>
  }

  if (status === 'FAILED') {
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Thanh toán lỗi</span>
  }

  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Chờ thanh toán</span>
}

const RefundBadge = ({ status }: { status?: string | null }) => {
  if (status === 'REFUNDED') {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Đã hoàn tiền</span>
  }

  return <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">Chưa hoàn tiền</span>
}

export default function HistoryTour() {
  const [confirmBooking, setConfirmBooking] = useState<BookingHistoryResponse | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')

  const {
    data: historyData,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['bookingHistory'],
    queryFn: bookingApi.getBookingHistory
  })

  const bookings = historyData?.data || []

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <span className="text-gray-600">Đang tải lịch sử đặt tour...</span>
      </div>
    )
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Lỗi khi tải lịch sử đặt tour</div>
  }

  return (
    <div>
      <h3 className="mb-6 border-b pb-3 text-2xl font-bold">Lịch sử đặt tour ({bookings.length})</h3>

      {bookings.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <FaCalendarAlt size={32} className="mx-auto mb-4" />
          Bạn chưa có lịch sử đặt tour nào
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div key={booking.bookingID} className="overflow-hidden rounded-xl border md:flex">
              <div className="h-48 md:w-1/4">
                <img
                  src={resolveAssetUrl(booking.tourImageURL, 'https://placehold.co/400x300?text=Tour')}
                  alt={booking.tourTitle}
                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x300?text=Tour')}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col justify-between p-4 md:w-3/4">
                <div>
                  <h4 className="mb-2 text-xl font-bold">
                    <Link to={`/tours/${booking.tourID}`} className="hover:text-blue-600">
                      {booking.tourTitle}
                    </Link>
                  </h4>

                  <div className="flex gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FaCalendarAlt />
                      {booking.bookingDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <FaUsers />
                      {booking.numAdults} người lớn, {booking.numChildren} trẻ em
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <div>
                    <div className="text-sm text-gray-500">Tổng tiền</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(booking.finalAmount)}</div>
                    <div className="text-xs text-gray-400">{booking.bookingID}</div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <StatusBadge status={booking.status} />
                    <PaymentBadge status={booking.paymentStatus} />
                    {booking.paymentStatus === 'SUCCESS' &&
                      (booking.status === 'CANCELED' || booking.status === 'CANCELLATION_REQUESTED') && (
                        <RefundBadge status={booking.refundStatus} />
                      )}

                    {booking.status === 'PROCESSING' && booking.paymentStatus !== 'SUCCESS' && (
                      <Link
                        to={`/payment/${booking.bookingID}`}
                        className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        Thanh toán
                      </Link>
                    )}

                    {(booking.status === 'PROCESSING' || booking.status === 'CONFIRMED') && (
                      <Button
                        variant="destructive"
                        className="text-white"
                        size="sm"
                        onClick={() => {
                          setConfirmBooking(booking)
                          setCancelReason('')
                          setCancelError('')
                        }}
                      >
                        Hủy tour
                      </Button>
                    )}

                    {booking.cancellationReason && (
                      <div className="basis-full rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
                        <span className="font-semibold">Lý do hủy:</span> {booking.cancellationReason}
                      </div>
                    )}

                    <ReviewButton tourId={booking.tourID} tourTitle={booking.tourTitle} status={booking.status} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">Xác nhận hủy tour</h3>

            <p className="mb-3 text-sm text-gray-600">
              {confirmBooking.paymentStatus === 'SUCCESS'
                ? 'Đơn đã thanh toán sẽ chuyển sang trạng thái chờ admin duyệt hủy và xử lý hoàn tiền theo chính sách.'
                : 'Đơn chưa thanh toán sẽ được hủy ngay, không cần admin duyệt.'}
            </p>
            <Link to="/refund-policy" className="mb-6 block text-sm font-semibold text-blue-600 hover:text-blue-700">
              Xem chính sách hủy và hoàn tiền
            </Link>

            <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="cancel-reason">
              Lý do hủy tour
            </label>
            <textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value)
                setCancelError('')
              }}
              rows={4}
              maxLength={1000}
              placeholder="Nhập lý do hủy để admin kiểm tra và xử lý..."
              className="mb-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mb-5 flex items-center justify-between text-xs">
              <span className="text-red-500">{cancelError}</span>
              <span className="text-gray-400">{cancelReason.trim().length}/1000</span>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setConfirmBooking(null)
                setCancelReason('')
                setCancelError('')
              }}>
                Không
              </Button>

              <Button
                variant="destructive"
                className="text-white"
                onClick={async () => {
                  const trimmedReason = cancelReason.trim()
                  if (trimmedReason.length < 5) {
                    setCancelError('Vui lòng nhập lý do hủy ít nhất 5 ký tự.')
                    return
                  }
                  await bookingApi.requestCancelBooking(confirmBooking.bookingID, trimmedReason)
                  setConfirmBooking(null)
                  setCancelReason('')
                  setCancelError('')
                  refetch()
                }}
              >
                Đồng ý hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
