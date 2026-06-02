// frontend-demo/src/components/TourBookingSection/TourBookingSection.tsx

import { useEffect, useState, useContext } from "react";
import { useForm, Controller } from "react-hook-form";
import { Calendar, Users, DollarSign, Heart } from "lucide-react";
import type { TourDetails } from "../../types/tour";
import { formatCurrency } from "../../utils/utils";
import Button from "../../components/Button";
import BookingModal from "../BookingModal";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AppContext } from "../../contexts/app.context";
import { favoriteApi } from "../../apis/favorite.api";
import type { AxiosError } from "axios";

interface Props {
    tour: TourDetails;
}

interface BookingFormData {
    adults: number;
    children: number;
    totalPrice: number;
}

const toValidPrice = (value: unknown) => {
    const price = Number(value);
    return Number.isFinite(price) && price > 0 ? price : null;
};

export default function TourBookingSection({ tour }: Props) {
    const { isAuthenticated, favoriteIds, addFavoriteId, removeFavoriteId } =
        useContext(AppContext);
    const queryClient = useQueryClient();

    const isLiked = favoriteIds.has(tour.tourID);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const {
        control,
        watch,
        setValue,
        formState: { errors },
    } = useForm<BookingFormData>({
        defaultValues: {
            adults: 1,
            children: 0,
            totalPrice: tour.finalPriceAdult,
        },
    });

    const adults = watch("adults");
    const children = watch("children");
    const totalPrice = watch("totalPrice");

    const adultPrice = toValidPrice(tour.finalPriceAdult) || toValidPrice(tour.priceAdult) || 0;
    const childPrice = toValidPrice(tour.finalPriceChild) || toValidPrice(tour.priceChild) || 0;

    useEffect(() => {
        const total = adults * adultPrice + children * childPrice;
        setValue("totalPrice", total);
    }, [adults, children, adultPrice, childPrice, setValue]);

    // --- PHẦN SỬA ĐỔI CHÍNH Ở ĐÂY ---
    const handleOpenBookingModal = () => {
        // 1. Kiểm tra đăng nhập trước tiên
        if (!isAuthenticated) {
            toast.info("Bạn vui lòng đăng nhập để đặt tour nhé!");
            return;
        }

        // 2. Sau đó mới kiểm tra dữ liệu form
        if (errors.adults || errors.children) {
            return;
        }

        setIsModalOpen(true);
    };
    // --------------------------------

    const addFavoriteMutation = useMutation({
        mutationFn: favoriteApi.addFavorite,
    });

    const removeFavoriteMutation = useMutation({
        mutationFn: favoriteApi.removeFavorite,
    });

    const handleFavorite = () => {
        if (!isAuthenticated) {
            toast.info("Bạn cần đăng nhập để thực hiện chức năng này");
            return;
        }

        if (isLiked) {
            removeFavoriteMutation.mutate(tour.tourID, {
                onSuccess: () => {
                    removeFavoriteId(tour.tourID);
                    toast.success("Đã xóa khỏi danh sách yêu thích!");
                    queryClient.invalidateQueries({ queryKey: ["favoriteIds"] });
                },
                onError: () => {
                    toast.error("Có lỗi xảy ra, vui lòng thử lại.");
                },
            });
        } else {
            addFavoriteMutation.mutate(
                { tourId: tour.tourID },
                {
                    onSuccess: () => {
                        addFavoriteId(tour.tourID);
                        toast.success("Đã thêm tour vào danh sách yêu thích!");
                        queryClient.invalidateQueries({ queryKey: ["favoriteIds"] });
                    },
                    onError: (error: Error | AxiosError) => {
                        const axiosError = error as AxiosError<{ message: string }>;
                        if (axiosError.response?.status === 409) {
                            addFavoriteId(tour.tourID);
                            toast.info("Bạn đã yêu thích tour này rồi.");
                        } else {
                            toast.error("Có lỗi xảy ra, vui lòng thử lại sau.");
                        }
                    },
                }
            );
        }
    };

    const maxParticipants = tour.maxParticipants || 20;
    const isProcessing = addFavoriteMutation.isPending || removeFavoriteMutation.isPending;

    return (
        <div className="bg-white p-6 rounded-lg shadow-xl sticky top-24">
            <h2 className="text-2xl font-semibold mb-5 text-gray-800">Đặt tour ngay</h2>

            <div className="mb-4 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                        <Users size={18} className="mr-2 text-blue-500" />
                        Giá người lớn:
                    </span>
                    <span className="font-semibold text-lg text-gray-900">
                        {formatCurrency(adultPrice)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                        <Users size={16} className="mr-2 text-blue-500" />
                        Giá trẻ em:
                    </span>
                    <span className="font-semibold text-lg text-gray-900">
                        {formatCurrency(childPrice)}
                    </span>
                </div>
                {tour.priceAdult > adultPrice && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Giá gốc (người lớn):</span>
                        <span className="text-gray-500 line-through">
                            {formatCurrency(tour.priceAdult)}
                        </span>
                    </div>
                )}
            </div>

            <hr className="my-4" />

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label
                        htmlFor="adults"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Người lớn
                    </label>
                    <Controller
                        name="adults"
                        control={control}
                        rules={{
                            min: { value: 1, message: "Phải có ít nhất 1 người lớn" },
                            validate: (value) =>
                                value + children <= maxParticipants ||
                                `Tổng số khách không vượt quá ${maxParticipants}`,
                        }}
                        render={({ field }) => (
                            <input
                                type="number"
                                id="adults"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                min="1"
                                max={maxParticipants}
                            />
                        )}
                    />
                </div>
                <div>
                    <label
                        htmlFor="children"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Trẻ em
                    </label>
                    <Controller
                        name="children"
                        control={control}
                        rules={{
                            min: { value: 0, message: "Số lượng không thể âm" },
                            validate: (value) =>
                                adults + value <= maxParticipants ||
                                `Tổng số khách không vượt quá ${maxParticipants}`,
                        }}
                        render={({ field }) => (
                            <input
                                type="number"
                                id="children"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                min="0"
                                max={maxParticipants - adults}
                            />
                        )}
                    />
                </div>
            </div>

            {(errors.adults || errors.children) && (
                <div className="mb-4 text-sm text-red-600">
                    {errors.adults?.message || errors.children?.message}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày khởi hành
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md flex items-center text-gray-700">
                    <Calendar size={18} className="mr-2 text-gray-500" />
                    {tour.startDate} (còn {tour.maxParticipants - (adults + children)} chỗ)
                </div>
            </div>

            <div className="flex justify-between items-center mb-5 p-4 bg-blue-50 rounded-lg">
                <span className="text-lg font-semibold text-gray-700 flex items-center">
                    <DollarSign size={20} className="mr-2" />
                    Tổng cộng:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalPrice)}
                </span>
            </div>

            <div className="space-y-3">
                <Button
                    type="button"
                    className="w-full text-lg font-semibold py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition duration-300 ease-in-out"
                    disabled={!!errors.adults || !!errors.children}
                    onClick={handleOpenBookingModal}
                >
                    Đặt Tour
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className={`w-full text-lg py-3 transition-colors duration-300 ${
                        isLiked
                            ? "text-red-500 border-red-200 hover:bg-red-50"
                            : "text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={handleFavorite}
                    disabled={isProcessing}
                >
                    <Heart
                        size={20}
                        className={`mr-2 transition-colors duration-300 ${
                            isLiked ? "fill-current text-red-500" : ""
                        }`}
                    />
                    {isLiked ? "Đã Yêu Thích" : "Yêu Thích"}
                </Button>
            </div>

            <BookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tour={tour}
                bookingDetails={{
                    adults: adults,
                    children: children,
                    totalPrice: totalPrice,
                }}
            />
        </div>
    );
}

