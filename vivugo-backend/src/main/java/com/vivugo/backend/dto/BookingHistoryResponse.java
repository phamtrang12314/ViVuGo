package com.vivugo.backend.dto;

import com.vivugo.backend.model.Booking;
import com.vivugo.backend.model.Payment;
import com.vivugo.backend.model.enums.BookingStatus;
import com.vivugo.backend.model.enums.PaymentStatus;
import com.vivugo.backend.model.enums.RefundStatus;

import java.util.Comparator;
import java.time.format.DateTimeFormatter;

public class BookingHistoryResponse {

    private String bookingID;
    private String tourID;
    private String tourTitle;
    private String tourImageURL;
    private String bookingDate;
    private Double finalAmount;
    private BookingStatus status;
    private PaymentStatus paymentStatus;
    private RefundStatus refundStatus;
    private String cancellationReason;
    private int numAdults;
    private int numChildren;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public BookingHistoryResponse(Booking booking) {
        this.bookingID = booking.getBookingID();
        this.tourID = booking.getTour().getTourID();
        this.tourTitle = booking.getTour().getTitle();
        this.tourImageURL = booking.getTour().getImageURL();
        this.bookingDate = booking.getBookingDate().format(DATE_FORMATTER); // Format ngày
        this.finalAmount = booking.getFinalAmount();
        this.status = booking.getStatus();
        this.paymentStatus = resolvePaymentStatus(booking);
        this.refundStatus = resolveRefundStatus(booking, this.paymentStatus);
        this.cancellationReason = booking.getCancellationReason();
        this.numAdults = booking.getNumAdults();
        this.numChildren = booking.getNumChildren();
    }

    private PaymentStatus resolvePaymentStatus(Booking booking) {
        if (booking.getInvoice() == null || booking.getInvoice().getPayments() == null
                || booking.getInvoice().getPayments().isEmpty()) {
            return PaymentStatus.PENDING;
        }
        return booking.getInvoice().getPayments().stream()
                .max(Comparator.comparing(Payment::getPaymentDate))
                .map(Payment::getStatus)
                .orElse(PaymentStatus.PENDING);
    }

    private RefundStatus resolveRefundStatus(Booking booking, PaymentStatus paymentStatus) {
        if (booking.getRefundStatus() != null) {
            return booking.getRefundStatus();
        }

        if (paymentStatus == PaymentStatus.SUCCESS
                && (booking.getStatus() == BookingStatus.CANCELED
                || booking.getStatus() == BookingStatus.CANCELLATION_REQUESTED)) {
            return RefundStatus.PENDING;
        }

        return null;
    }

    public String getBookingID() { return bookingID; }
    public String getTourID() { return tourID; }
    public String getTourTitle() { return tourTitle; }
    public String getTourImageURL() { return tourImageURL; }
    public String getBookingDate() { return bookingDate; }
    public Double getFinalAmount() { return finalAmount; }
    public BookingStatus getStatus() { return status; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public RefundStatus getRefundStatus() { return refundStatus; }
    public String getCancellationReason() { return cancellationReason; }
    public int getNumAdults() { return numAdults; }
    public int getNumChildren() { return numChildren; }

    public void setBookingID(String bookingID) { this.bookingID = bookingID; }
    public void setTourID(String tourID) { this.tourID = tourID; }
    public void setTourTitle(String tourTitle) { this.tourTitle = tourTitle; }
    public void setTourImageURL(String tourImageURL) { this.tourImageURL = tourImageURL; }
    public void setBookingDate(String bookingDate) { this.bookingDate = bookingDate; }
    public void setFinalAmount(Double finalAmount) { this.finalAmount = finalAmount; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public void setRefundStatus(RefundStatus refundStatus) { this.refundStatus = refundStatus; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }
    public void setNumAdults(int numAdults) { this.numAdults = numAdults; }
    public void setNumChildren(int numChildren) { this.numChildren = numChildren; }
}
