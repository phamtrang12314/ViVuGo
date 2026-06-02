package com.vivugo.backend.admin.dto.response.booking;

import com.vivugo.backend.model.enums.BookingStatus;
import com.vivugo.backend.model.enums.PaymentStatus;
import com.vivugo.backend.model.enums.RefundStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class BookingDetailResponse {

    // ====== BOOKING ======
    private String bookingID;
    private LocalDateTime bookingDate;
    private BookingStatus status;
    private RefundStatus refundStatus;
    private LocalDateTime refundedAt;
    private String cancellationReason;

    private int numAdults;
    private int numChildren;
    private double totalPrice;
    private double discountAmount;
    private double finalAmount;

    // ====== NESTED ======
    private CustomerInfo customer;
    private TourInfo tour;
    private PromotionInfo promotion;
    private InvoiceInfo invoice;
    private List<PaymentInfo> payments;
    private List<ParticipantInfo> participants;

    // ====== GET/SET ======

    public String getBookingID() {
        return bookingID;
    }

    public void setBookingID(String bookingID) {
        this.bookingID = bookingID;
    }

    public LocalDateTime getBookingDate() {
        return bookingDate;
    }

    public void setBookingDate(LocalDateTime bookingDate) {
        this.bookingDate = bookingDate;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public void setStatus(BookingStatus status) {
        this.status = status;
    }

    public RefundStatus getRefundStatus() {
        return refundStatus;
    }

    public void setRefundStatus(RefundStatus refundStatus) {
        this.refundStatus = refundStatus;
    }

    public LocalDateTime getRefundedAt() {
        return refundedAt;
    }

    public void setRefundedAt(LocalDateTime refundedAt) {
        this.refundedAt = refundedAt;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public int getNumAdults() {
        return numAdults;
    }

    public void setNumAdults(int numAdults) {
        this.numAdults = numAdults;
    }

    public int getNumChildren() {
        return numChildren;
    }

    public void setNumChildren(int numChildren) {
        this.numChildren = numChildren;
    }

    public double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public double getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(double discountAmount) {
        this.discountAmount = discountAmount;
    }

    public double getFinalAmount() {
        return finalAmount;
    }

    public void setFinalAmount(double finalAmount) {
        this.finalAmount = finalAmount;
    }

    public CustomerInfo getCustomer() {
        return customer;
    }

    public void setCustomer(CustomerInfo customer) {
        this.customer = customer;
    }

    public TourInfo getTour() {
        return tour;
    }

    public void setTour(TourInfo tour) {
        this.tour = tour;
    }

    public PromotionInfo getPromotion() {
        return promotion;
    }

    public void setPromotion(PromotionInfo promotion) {
        this.promotion = promotion;
    }

    public InvoiceInfo getInvoice() {
        return invoice;
    }

    public void setInvoice(InvoiceInfo invoice) {
        this.invoice = invoice;
    }

    public List<PaymentInfo> getPayments() {
        return payments;
    }

    public void setPayments(List<PaymentInfo> payments) {
        this.payments = payments;
    }

    public List<ParticipantInfo> getParticipants() {
        return participants;
    }

    public void setParticipants(List<ParticipantInfo> participants) {
        this.participants = participants;
    }

    // ====== NESTED CLASSES ======

    public static class CustomerInfo {
        private String userID;
        private String name;
        private String email;
        private String phone;

        public String getUserID() {
            return userID;
        }

        public void setUserID(String userID) {
            this.userID = userID;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }
    }

    public static class TourInfo {
        private String tourID;
        private String name;              // từ Tour.title
        private String code;              // chưa có field code -> để null / sau này thêm
        private LocalDate departureDate;  // Tour.startDate
        private String destinationName;   // nếu có Destination thì map sau

        public String getTourID() {
            return tourID;
        }

        public void setTourID(String tourID) {
            this.tourID = tourID;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public LocalDate getDepartureDate() {
            return departureDate;
        }

        public void setDepartureDate(LocalDate departureDate) {
            this.departureDate = departureDate;
        }

        public String getDestinationName() {
            return destinationName;
        }

        public void setDestinationName(String destinationName) {
            this.destinationName = destinationName;
        }
    }

    public static class PromotionInfo {
        private String promotionID;
        private String code; // dùng Promotion.title làm code
        private String name; // có thể dùng description hoặc title
        private Integer discountPercent;

        public String getPromotionID() {
            return promotionID;
        }

        public void setPromotionID(String promotionID) {
            this.promotionID = promotionID;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Integer getDiscountPercent() {
            return discountPercent;
        }

        public void setDiscountPercent(Integer discountPercent) {
            this.discountPercent = discountPercent;
        }
    }

    public static class InvoiceInfo {
        private String invoiceID;
        private Double totalAmount;
        private Double taxPercentage;
        private LocalDateTime createdAt;

        public String getInvoiceID() {
            return invoiceID;
        }

        public void setInvoiceID(String invoiceID) {
            this.invoiceID = invoiceID;
        }

        public Double getTotalAmount() {
            return totalAmount;
        }

        public void setTotalAmount(Double totalAmount) {
            this.totalAmount = totalAmount;
        }

        public Double getTaxPercentage() {
            return taxPercentage;
        }

        public void setTaxPercentage(Double taxPercentage) {
            this.taxPercentage = taxPercentage;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
        }
    }

    public static class PaymentInfo {
        private String paymentID;
        private Double amountPaid;
        private LocalDateTime paymentDate;
        private PaymentStatus status;
        private String paymentMethod;
        private String transactionCode;

        public String getPaymentID() {
            return paymentID;
        }

        public void setPaymentID(String paymentID) {
            this.paymentID = paymentID;
        }

        public Double getAmountPaid() {
            return amountPaid;
        }

        public void setAmountPaid(Double amountPaid) {
            this.amountPaid = amountPaid;
        }

        public LocalDateTime getPaymentDate() {
            return paymentDate;
        }

        public void setPaymentDate(LocalDateTime paymentDate) {
            this.paymentDate = paymentDate;
        }

        public PaymentStatus getStatus() {
            return status;
        }

        public void setStatus(PaymentStatus status) {
            this.status = status;
        }

        public String getPaymentMethod() {
            return paymentMethod;
        }

        public void setPaymentMethod(String paymentMethod) {
            this.paymentMethod = paymentMethod;
        }

        public String getTransactionCode() {
            return transactionCode;
        }

        public void setTransactionCode(String transactionCode) {
            this.transactionCode = transactionCode;
        }
    }

    public static class ParticipantInfo {
        private String participantID;
        private String customerName;
        private String customerPhone;
        private String identification;
        private String gender;          // enum -> string
        private String participantType; // enum -> string

        public String getParticipantID() {
            return participantID;
        }

        public void setParticipantID(String participantID) {
            this.participantID = participantID;
        }

        public String getCustomerName() {
            return customerName;
        }

        public void setCustomerName(String customerName) {
            this.customerName = customerName;
        }

        public String getCustomerPhone() {
            return customerPhone;
        }

        public void setCustomerPhone(String customerPhone) {
            this.customerPhone = customerPhone;
        }

        public String getIdentification() {
            return identification;
        }

        public void setIdentification(String identification) {
            this.identification = identification;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }

        public String getParticipantType() {
            return participantType;
        }

        public void setParticipantType(String participantType) {
            this.participantType = participantType;
        }
    }
}
