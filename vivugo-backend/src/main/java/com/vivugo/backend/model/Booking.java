package com.vivugo.backend.model;

import com.vivugo.backend.model.enums.BookingStatus;
import com.vivugo.backend.model.enums.RefundStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "bookings")
@Getter
@Setter
public class Booking {

    @Id
//    @GeneratedValue(strategy = GenerationType.UUID)
    private String bookingID;

    @Column(nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime bookingDate;

    private int numAdults;
    private int numChildren;

    @Column(nullable = false)
    private Double totalPrice; // Giá gốc

    private Double discountAmount = 0.0; // Số tiền được giảm

    @Column(nullable = false)
    private Double finalAmount; // Giá cuối = totalPrice - discountAmount

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Enumerated(EnumType.STRING)
    private RefundStatus refundStatus;

    private LocalDateTime refundedAt;

    @Column(length = 1000)
    private String cancellationReason;

    // --- Mối quan hệ ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    // Ghi lại khuyến mãi đã dùng
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion_id", nullable = true)
    private Promotion promotion;

    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Invoice invoice;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Participant> participants;
}
