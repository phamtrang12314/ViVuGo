package com.vivugo.backend.dto;

import com.vivugo.backend.model.Promotion;
import com.vivugo.backend.model.Review;
import com.vivugo.backend.model.Tour;
import com.vivugo.backend.model.TourDestination;
import com.vivugo.backend.model.TourPromotion;
import com.vivugo.backend.model.enums.PromotionStatus;
import com.vivugo.backend.model.enums.TourStatus;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.time.LocalDate;
import java.util.Comparator;

public class TourSummaryResponse {
    private String tourID;
    private String title;
    private String imageURL;
    private int durationDays;
    private int durationNights;
    private String destinationName;
    private Double priceAdult;
    private Double finalPrice;
    private int discountPercentage;
    private double averageRating;
    private int reviewCount;
    private String tourTypeName;
    private TourStatus status;
    private List<TourImageDto> tourImages;

    public TourSummaryResponse(Tour tour) {
        this.tourID = tour.getTourID();
        this.title = tour.getTitle();
        this.imageURL = tour.getImageURL();
        this.durationDays = tour.getDurationDays();
        this.durationNights = tour.getDurationNights();
        this.priceAdult = tour.getPriceAdult();
        this.status = tour.getStatus();

        if (tour.getTourType() != null) {
            this.tourTypeName = tour.getTourType().getNameType();
        }

        if (tour.getTourDestinations() != null && !tour.getTourDestinations().isEmpty()) {
            Optional<TourDestination> firstDest = tour.getTourDestinations().stream().findFirst();
            firstDest.ifPresent(td -> {
                if (td.getDestination() != null) {
                    this.destinationName = td.getDestination().getNameDes();
                }
            });
        }

        Set<Review> reviews = tour.getReviews();
        if (reviews != null && !reviews.isEmpty()) {
            this.reviewCount = reviews.size();
            double sum = reviews.stream().mapToInt(Review::getRating).sum();
            this.averageRating = Math.round((sum / this.reviewCount) * 10.0) / 10.0;
        } else {
            this.reviewCount = 0;
            this.averageRating = 0.0;
        }

        this.discountPercentage = 0;
        if (tour.getTourPromotions() != null && !tour.getTourPromotions().isEmpty()) {
            LocalDate today = LocalDate.now();
            Optional<Promotion> activePromo = tour.getTourPromotions().stream()
                    .map(TourPromotion::getPromotion)
                    .filter(p -> p != null
                            && p.getStatus() == PromotionStatus.ACTIVE
                            && p.getDiscountPercentage() > 0
                            && p.getStartDate() != null
                            && p.getEndDate() != null
                            && !today.isBefore(p.getStartDate())
                            && !today.isAfter(p.getEndDate()))
                    .max(Comparator.comparingDouble(Promotion::getDiscountPercentage));
            if (activePromo.isPresent()) {
                this.discountPercentage = activePromo.get().getDiscountPercentage();
            }
        }

        if (this.discountPercentage > 0 && this.priceAdult != null) {
            double discountAmount = this.priceAdult * (this.discountPercentage / 100.0);
            double discountedPrice = this.priceAdult - discountAmount;
            this.finalPrice = Math.ceil(discountedPrice / 10000.0) * 10000.0;
        } else {
            this.finalPrice = this.priceAdult;
        }

        this.tourImages = tour.getTourImages().stream()
                .map(TourImageDto::new)
                .toList();
    }

    public String getTourID() { return tourID; }
    public String getTitle() { return title; }
    public String getImageURL() { return imageURL; }
    public int getDurationDays() { return durationDays; }
    public int getDurationNights() { return durationNights; }
    public String getDestinationName() { return destinationName; }
    public Double getPriceAdult() { return priceAdult; }
    public Double getFinalPrice() { return finalPrice; }
    public int getDiscountPercentage() { return discountPercentage; }
    public double getAverageRating() { return averageRating; }
    public int getReviewCount() { return reviewCount; }
    public String getTourTypeName() { return tourTypeName; }
    public TourStatus getStatus() { return status; }
    public List<TourImageDto> getTourImages() { return tourImages; }
}
