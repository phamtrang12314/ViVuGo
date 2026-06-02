import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { BookingAdmin } from "../../types/bookingAdmin";
import type { PaymentStatus } from "@/admin/types/paymentStatus";
import { bookingAdminApi } from "../../apis/bookingAdmin.api";
import { ArrowLeft, RefreshCw } from "lucide-react";

// helper
const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const paymentLabelMap: Record<PaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  SUCCESS: "Đã thanh toán",
  FAILED: "Thanh toán lỗi",
};

const paymentBadgeClassMap: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  SUCCESS: "bg-green-50 text-green-700 border border-green-200",
  FAILED: "bg-red-50 text-red-600 border border-red-200",
};

const CanceledBookingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(0);
  const size = 10;

  const [selectedBooking, setSelectedBooking] = useState<BookingAdmin | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<"CANCEL" | "KEEP" | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");


  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-canceled-bookings", page, size],
    queryFn: async () => {
      const res = await bookingAdminApi.getCanceledBookings({ page, size });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const bookings: BookingAdmin[] = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const currentPage = data?.number ?? 0;

  const handleRefresh = () => {
    refetch();
  };

  const handleOpenActionModal = (booking: BookingAdmin, type: "CANCEL" | "KEEP") => {
    setSelectedBooking(booking);
    setAction(type);
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedBooking || !action) return;

    try {
      setIsProcessing(true);

      if (action === "CANCEL") {
        await bookingAdminApi.approveCancel(selectedBooking.bookingID);
        setSuccessMessage(`Đã duyệt hủy booking #${selectedBooking.bookingID} thành công.`);
      } else if (action === "KEEP") {
        await bookingAdminApi.keepBooking(selectedBooking.bookingID);
        setSuccessMessage(`Đã KHÔNG hủy booking #${selectedBooking.bookingID}.`);
      }

      setIsSuccessOpen(true); // mở modal thành công
      setIsConfirmOpen(false);
      setSelectedBooking(null);
      setAction(null);

      refetch();
    } catch (error) {
      console.error(error);
      alert("Xử lý thất bại. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };




  const handlePageChange = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    setPage(nextPage);
  };

    

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">

         <button
            onClick={() => navigate("/admin/manage-booking")}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white shadow hover:bg-gray-50 border border-gray-200"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Xử lý đơn hủy tour
            </h1>
            <p className="text-sm text-gray-500">
              Danh sách các booking ở trạng thái <b>Chờ hủy</b>. Bạn có thể xử
              lý từng đơn một.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition"
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200 text-gray-600 text-xs uppercase border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 font-semibold text-black">Booking</th>
              <th className="px-5 py-3 font-semibold text-black">
                Khách hàng
              </th>
              <th className="px-5 py-3 font-semibold text-black">Tour</th>
              <th className="px-5 py-3 font-semibold text-black">
                Ngày khởi hành
              </th>
              <th className="px-5 py-3 font-semibold text-black">Giá</th>
              <th className="px-5 py-3 font-semibold text-black">Lý do hủy</th>
              <th className="px-5 py-3 font-semibold text-black">
                Thanh toán
              </th>
              <th className="px-5 py-3 font-semibold text-black text-center">
                Hành động
              </th>
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
                  Không có booking nào đang chờ hủy.
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
                      <span className="font-semibold text-gray-900 text-sm">
                        {b.bookingID}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(b.bookingDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 text-sm">
                        {b.customerName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {b.numGuests} khách
                      </span>
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
                    {b.departureDate
                      ? new Date(b.departureDate).toLocaleDateString("vi-VN")
                      : "-"}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span className="text-blue-600 font-semibold">
                      {formatCurrency(b.finalAmount)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top max-w-xs">
                    <p className="line-clamp-3 text-sm text-gray-700" title={b.cancellationReason || ""}>
                      {b.cancellationReason || "Chưa có lý do"}
                    </p>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${paymentBadgeClassMap[b.paymentStatus]
                        }`}
                    >
                      {paymentLabelMap[b.paymentStatus]}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Nút xem chi tiết */}
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/manage-booking/detail/${b.bookingID}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-500 text-blue-600 bg-white text-xs font-medium hover:bg-blue-50" >
                        Chi tiết đơn
                      </button>

                      {/* Nút KHÔNG hủy */}
                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(b, "KEEP")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 border border-transparent"
                      >
                        Không hủy
                      </button>

                      {/* Nút duyệt hủy */}
                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(b, "CANCEL")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 border border-transparent"
                      >
                        Hủy
                      </button>


                    </div>
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

      {/* xác nhận hủy  */}
      {/* Modal xác nhận hủy booking */}
      {isConfirmOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {action === "CANCEL"
                ? "Xác nhận duyệt hủy booking"
                : "Xác nhận KHÔNG hủy booking"}
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc chắn muốn{" "}
              <span className="font-semibold text-red-600">
                {action === "CANCEL" ? "duyệt hủy" : "KHÔNG hủy"} booking #
                {selectedBooking.bookingID}
              </span>{" "}
              cho khách{" "}
              <span className="font-semibold">
                {selectedBooking.customerName}
              </span>{" "}
              không?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  if (isProcessing) return;
                  setIsConfirmOpen(false);
                  setSelectedBooking(null);
                  setAction(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 disabled:opacity-60"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 ${action === "CANCEL" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                  }`}
              >
                {isProcessing
                  ? "Đang xử lý..."
                  : action === "CANCEL"
                    ? "Xác nhận duyệt hủy"
                    : "Xác nhận KHÔNG hủy"}
              </button>
            </div>
          </div>
        </div>
      )}{/* Modal thông báo thành công */}
      {isSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">

            <h3 className="text-lg font-semibold text-green-600 mb-3">
              Thao tác thành công
            </h3>

            <p className="text-sm text-gray-700 mb-6">
              {successMessage}
            </p>

            <button
              type="button"
              onClick={() => setIsSuccessOpen(false)}
              className="px-4 py-2 w-full rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
            >
              Đóng
            </button>

          </div>
        </div>
      )}



    </div>
  );
};

export default CanceledBookingsScreen;

