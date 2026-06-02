package com.vivugo.backend.admin.dto.response.booking;

import com.vivugo.backend.model.Booking;
import com.vivugo.backend.model.Invoice;
import com.vivugo.backend.model.Payment;
import com.vivugo.backend.model.enums.BookingStatus;
import com.vivugo.backend.model.enums.PaymentStatus;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;

@Getter
public class BookingAdminResponse {

    private final String bookingID;
    private final LocalDateTime bookingDate;

    private final String customerName;
    private final int numGuests;

    private final String tourName;
    private final LocalDate departureDate;

    private final Double finalAmount;
    private final BookingStatus status;
    private final PaymentStatus paymentStatus;
    private final String cancellationReason;

    public BookingAdminResponse(Booking booking) {
        this.bookingID = booking.getBookingID();
        this.bookingDate = booking.getBookingDate();

        this.customerName = booking.getUser() != null
                ? booking.getUser().getName()
                : "Khách lẻ";

        this.numGuests = booking.getNumAdults() + booking.getNumChildren();

        this.tourName = booking.getTour() != null
                ? booking.getTour().getTitle()
                : "(Tour đã xoá)";

        this.departureDate = booking.getTour() != null
                ? booking.getTour().getStartDate()
                : null;

        this.finalAmount = booking.getFinalAmount();
        this.status = booking.getStatus();
        this.cancellationReason = booking.getCancellationReason();

        this.paymentStatus = resolvePaymentStatus(booking);
    }

    private PaymentStatus resolvePaymentStatus(Booking booking) {
        Invoice invoice = booking.getInvoice();
        if (invoice == null || invoice.getPayments() == null || invoice.getPayments().isEmpty()) {
            return PaymentStatus.PENDING;
        }

        Payment latest = invoice.getPayments().stream()
                .max(Comparator.comparing(Payment::getPaymentDate))
                .orElse(null);

        if (latest == null) return PaymentStatus.PENDING;
        return latest.getStatus();
    }
}
