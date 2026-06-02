// src/admin/pages/BookingDetailAdminScreen.tsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  User,
  MapPin,
  Calendar,
  Receipt,
  CreditCard,
  Users,
  Tag,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";

import { bookingAdminApi } from "../../apis/bookingAdmin.api";
import type { BookingDetailAdmin } from "../../types/bookingAdmin";
import type { BookingStatus } from "@/types/booking.type";
import type { PaymentStatus } from "@/admin/types/paymentStatus";

const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const statusLabelMap: Record<BookingStatus, string> = {
  PROCESSING: "Đang xử lý",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Hoàn thành",
  CANCELED: "Đã hủy",
  CANCELLATION_REQUESTED: "Chờ duyệt hủy"
};

const statusBadgeClassMap: Record<BookingStatus, string> = {
  PROCESSING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  CONFIRMED: "bg-green-50 text-green-700 border border-green-200",
  COMPLETED: "bg-blue-50 text-blue-700 border border-blue-200",
  CANCELED: "bg-red-50 text-red-600 border border-red-200",
  CANCELLATION_REQUESTED: "bg-red-50 text-red-600 border border-red-200",
};

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

const genderLabelMap: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

const participantTypeLabelMap: Record<string, string> = {
  ADULT: "Người lớn",
  CHILD: "Trẻ em",
};


const BookingDetailAdminScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<"cancel" | "keep" | "refund" | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-booking-detail", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error("missing id");
      const res = await bookingAdminApi.getBookingDetail(id);
      return res.data;
    },
  });

  const handleBack = () => navigate("/admin/bookings");

  const handleApproveCancel = async () => {
    if (!id) return;

    const ok = window.confirm(
      "Duyet huy booking nay? Neu don da thanh toan, ban can xu ly hoan tien rieng."
    );
    if (!ok) return;

    try {
      setActionLoading("cancel");
      await bookingAdminApi.approveCancel(id);
      toast.success("Da duyet huy booking thanh cong");
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error("Duyet huy booking that bai");
    } finally {
      setActionLoading(null);
    }
  };

  const handleKeepBooking = async () => {
    if (!id) return;

    const ok = window.confirm("Giu booking nay va chuyen ve trang thai da xac nhan?");
    if (!ok) return;

    try {
      setActionLoading("keep");
      await bookingAdminApi.keepBooking(id);
      toast.success("Da giu booking va chuyen ve da xac nhan");
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error("Giu booking that bai");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkRefunded = async () => {
    if (!id) return;

    const ok = window.confirm(
      "Xác nhận đã hoàn tiền cho booking này? Thao tác này chỉ đánh dấu sau khi bạn đã chuyển khoản hoàn tiền bên ngoài."
    );
    if (!ok) return;

    try {
      setActionLoading("refund");
      await bookingAdminApi.markRefunded(id);
      toast.success("Đã đánh dấu booking là đã hoàn tiền");
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error("Đánh dấu hoàn tiền thất bại");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Đang tải thông tin booking...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8">
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách
        </button>
        <p className="text-sm text-red-500">Không tìm thấy booking.</p>
      </div>
    );
  }

  const booking: BookingDetailAdmin = data;
  const hasSuccessfulPayment = booking.payments.some((payment) => payment.status === "SUCCESS");
  const needsRefund = hasSuccessfulPayment
    && booking.status === "CANCELED"
    && booking.refundStatus !== "REFUNDED";

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/manage-booking")}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white shadow hover:bg-gray-50 border border-gray-200"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Chi tiết booking #{booking.bookingID}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {booking.status === "CANCELLATION_REQUESTED" && (
            <>
              <button
                type="button"
                onClick={handleKeepBooking}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle size={16} />
                {actionLoading === "keep" ? "Dang xu ly..." : "Giu booking"}
              </button>
              <button
                type="button"
                onClick={handleApproveCancel}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                {actionLoading === "cancel" ? "Dang xu ly..." : "Duyet huy"}
              </button>
            </>
          )}

          {needsRefund && (
            <button
              type="button"
              onClick={handleMarkRefunded}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={16} />
              {actionLoading === "refund" ? "Đang xử lý..." : "Đã hoàn tiền"}
            </button>
          )}

          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClassMap[booking.status]
              }`}
          >
            {statusLabelMap[booking.status]}
          </span>
        </div>
      </div>

      {/* Grid trên: 2 cột */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Cột trái: Booking + Khách + Tour */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Thông tin booking */}
          <section className="bg-white rounded-3xl shadow-md p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Thông tin đơn đặt
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  Số khách / Người lớn / Trẻ em
                </div>
                <div className="font-medium">
                  {booking.numAdults + booking.numChildren} khách (
                  {booking.numAdults} NL, {booking.numChildren} TE)
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Tổng giá gốc</div>
                <div className="font-semibold text-gray-900">
                  {formatCurrency(booking.totalPrice)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Giảm giá</div>
                <div className="font-semibold text-red-500">
                  -{formatCurrency(booking.discountAmount)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Giá cuối</div>
                <div className="font-semibold text-blue-600">
                  {formatCurrency(booking.finalAmount)}
                </div>
              </div>
            </div>

            {(booking.status === "CANCELLATION_REQUESTED" || booking.status === "CANCELED" || booking.cancellationReason) && (
              <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <div className="mb-1 text-xs font-bold uppercase text-orange-700">Lý do hủy từ khách hàng</div>
                <p className="whitespace-pre-wrap text-sm text-orange-950">
                  {booking.cancellationReason || "Chưa có lý do hủy."}
                </p>
              </div>
            )}
          </section>

          {/* Khách hàng + Tour */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Khách hàng */}
            <div className="bg-white rounded-3xl shadow-md p-6">
              <div className="flex items-center gap-2 mb-3">
                <User size={18} className="text-gray-700" />
                <h2 className="text-base font-semibold text-gray-800">
                  Khách hàng
                </h2>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-semibold text-gray-900">
                  {booking.customer.name}
                </div>
                <div>Email: {booking.customer.email}</div>
                {booking.customer.phone && (
                  <div>Điện thoại: {booking.customer.phone}</div>
                )}
              </div>
            </div>

            {/* Tour */}
            <div className="bg-white rounded-3xl shadow-md p-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-gray-700" />
                <h2 className="text-base font-semibold text-gray-800">Tour</h2>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-semibold text-gray-900">
                  {booking.tour.name}
                </div>
                {booking.tour.code && (
                  <div className="text-xs text-gray-500">
                    Mã tour: {booking.tour.code}
                  </div>
                )}
                {booking.tour.destinationName && (
                  <div>Điểm đến: {booking.tour.destinationName}</div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                  <Calendar size={14} />
                  <span>
                    Ngày khởi hành:{" "}
                    {booking.tour.departureDate
                      ? new Date(
                        booking.tour.departureDate
                      ).toLocaleDateString("vi-VN")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Cột phải: Hóa đơn & Thanh toán + Khuyến mãi */}
        <div className="flex flex-col gap-4">
          {/* Hóa đơn và thanh toán */}
          <section className="bg-white rounded-3xl shadow-md p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={18} className="text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800">
                Hóa đơn và Thanh toán
              </h2>
            </div>

            {booking.invoice ? (
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex justify-between">
                  <span>Mã hóa đơn:</span>
                  <span className="font-medium">
                    {booking.invoice.invoiceID}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày tạo:</span>
                  <span>
                    {new Date(
                      booking.invoice.createdAt
                    ).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng tiền hóa đơn:</span>
                  <span className="font-semibold">
                    {formatCurrency(booking.invoice.totalAmount)}
                  </span>
                </div>
                {booking.invoice.taxPercentage != null && (
                  <div className="flex justify-between">
                    <span>Thuế (%):</span>
                    <span>{booking.invoice.taxPercentage}%</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Chưa có hóa đơn cho booking này.
              </p>
            )}

            <div className="border-t border-gray-100 pt-3">
              {hasSuccessfulPayment && (booking.status === "CANCELED" || booking.status === "CANCELLATION_REQUESTED") && (
                <div className="mb-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <span className="font-semibold">Hoàn tiền: </span>
                  {booking.refundStatus === "REFUNDED" ? (
                    <span className="font-semibold text-emerald-700">
                      Đã hoàn tiền{booking.refundedAt ? ` lúc ${new Date(booking.refundedAt).toLocaleString("vi-VN")}` : ""}
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700">Chưa hoàn tiền</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={16} className="text-gray-700" />
                <span className="text-sm font-semibold text-gray-800">
                  Lịch sử thanh toán
                </span>
              </div>

              {booking.payments.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Chưa có thanh toán nào được ghi nhận.
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {booking.payments.map((p) => (
                    <div
                      key={p.paymentID}
                      className="flex justify-between items-start text-xs bg-gray-50 rounded-xl px-3 py-2"
                    >
                      <div>
                        <div className="font-semibold">
                          {formatCurrency(p.amountPaid)}
                        </div>
                        <div className="text-gray-500">
                          {new Date(p.paymentDate).toLocaleString("vi-VN")}
                        </div>
                        {p.paymentMethod && (
                          <div className="text-gray-500">
                            Phương thức: {p.paymentMethod}
                          </div>
                        )}
                        {p.transactionCode && (
                          <div className="text-gray-500">
                            Mã giao dịch: {p.transactionCode}
                          </div>
                        )}
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${paymentBadgeClassMap[p.status]
                          }`}
                      >
                        {paymentLabelMap[p.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Khuyến mãi */}
          <section className="bg-white rounded-3xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={18} className="text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800">
                Khuyến mãi
              </h2>
            </div>

            {booking.promotion ? (
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-semibold text-gray-900">
                  {booking.promotion.name}
                </div>
                <div>Mã: {booking.promotion.code}</div>
                {booking.promotion.discountPercent != null && (
                  <div>Giảm: {booking.promotion.discountPercent}%</div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Không áp dụng khuyến mãi.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Bảng danh sách khách tham gia */}
      <section className="bg-white rounded-3xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-gray-700" />
          <h2 className="text-base font-semibold text-gray-800">
            Danh sách khách tham gia
          </h2>
        </div>

        {booking.participants.length === 0 ? (
          <p className="text-xs text-gray-500">
            Chưa có thông tin khách tham gia.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-2">Tên khách</th>
                  <th className="px-4 py-2">Điện thoại</th>
                  <th className="px-4 py-2">Giấy tờ</th>
                  <th className="px-4 py-2">Giới tính</th>
                  <th className="px-4 py-2">Loại khách</th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {booking.participants.map((p) => (
                  <tr key={p.participantID} className="border-b border-gray-100">
                    <td className="px-4 py-2">{p.customerName}</td>
                    <td className="px-4 py-2">
                      {p.customerPhone || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-2">
                      {p.identification || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-2">
                      {p.gender ? (
                        genderLabelMap[p.gender] || p.gender
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    <td className="px-4 py-2">
                      {p.participantType ? (
                        participantTypeLabelMap[p.participantType] || p.participantType
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default BookingDetailAdminScreen;

