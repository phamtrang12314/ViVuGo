import { Link } from 'react-router-dom'
import type { Tour } from '../../types/tour'
import { formatCurrency, resolveAssetUrl } from '../../utils/utils'
import { FaMapMarkerAlt, FaStar, FaClock, FaHeart } from 'react-icons/fa'
import Button from '../Button'
import React, { useContext } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { AppContext } from '../../contexts/app.context'
import { favoriteApi } from '../../apis/favorite.api'
import type { AxiosError } from 'axios'

const toValidPrice = (value: unknown) => {
  const price = Number(value)
  return Number.isFinite(price) && price > 0 ? price : null
}

export default function TourCard({
  tour,
  isFavoritePage = false
}: {
  tour: Tour
  isFavoritePage?: boolean
}) {
  const { isAuthenticated, favoriteIds, addFavoriteId, removeFavoriteId } = useContext(AppContext)
  const queryClient = useQueryClient()

  // BẢO VỆ ID: Xử lý lỗi mất ID do JSON parse từ Spring Boot
  const safeId = tour.tourID || (tour as any).tourId || (tour as any).id || '';

  const isLiked = favoriteIds.has(safeId)

  const addFavoriteMutation = useMutation({ mutationFn: favoriteApi.addFavorite })
  const removeFavoriteMutation = useMutation({ mutationFn: favoriteApi.removeFavorite })

  const priceAdult = toValidPrice(tour.priceAdult) || 0
  const finalPrice = toValidPrice(tour.finalPrice) || priceAdult
  const hasDiscount = priceAdult > 0 && finalPrice > 0 && finalPrice < priceAdult
  const averageRating = tour.averageRating || 0
  const reviewCount = tour.reviewCount || 0
  const durationDays = tour.durationDays || 0
  const durationNights = tour.durationNights || 0

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      toast.info('Bạn cần đăng nhập để thực hiện chức năng này')
      return
    }

    if (isLiked) {
      removeFavoriteMutation.mutate(safeId, {
        onSuccess: () => {
          removeFavoriteId(safeId)
          toast.success('Đã xóa khỏi danh sách yêu thích!')
          queryClient.invalidateQueries({ queryKey: ['favoriteIds'] })
        },
        onError: () => toast.error('Có lỗi xảy ra, vui lòng thử lại.')
      })
    } else {
      addFavoriteMutation.mutate(
        { tourId: safeId },
        {
          onSuccess: () => {
            addFavoriteId(safeId)
            toast.success('Đã thêm tour vào danh sách yêu thích!')
            queryClient.invalidateQueries({ queryKey: ['favoriteIds'] })
          },
          onError: (error: AxiosError | Error) => {
            const axiosError = error as AxiosError<{ message: string }>
            if (axiosError.response?.status === 409) {
              addFavoriteId(safeId)
              toast.info('Bạn đã yêu thích tour này rồi.')
            } else {
              toast.error('Có lỗi xảy ra, vui lòng thử lại sau.')
            }
          }
        }
      )
    }
  }

  return (
    <div className="bg-white rounded-[2rem] p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)] transition-all duration-300 group border border-gray-100 flex flex-col h-full">
      {/* Wrapper Hình ảnh */}
      <div className="relative h-60 rounded-3xl overflow-hidden mb-4">
        <Link to={`/tours/${safeId}`} className="block w-full h-full">
          <img
            src={resolveAssetUrl(tour.imageURL, 'https://placehold.co/400x256/E5E7EB/6B7280?text=Tour')}
            alt={tour.title}
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/400x256/E5E7EB/6B7280?text=Tour'
            }}
            className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        </Link>

        {!isFavoritePage && (
          <button
            onClick={handleFavoriteClick}
            disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
            className={`absolute top-4 right-4 z-10 p-2.5 bg-white/70 backdrop-blur-md rounded-full shadow-sm transition-all duration-300 transform hover:scale-110
              ${isLiked ? 'text-red-500 bg-white' : 'text-gray-500 hover:text-red-500 hover:bg-white'}
              ${addFavoriteMutation.isPending || removeFavoriteMutation.isPending ? 'cursor-not-allowed opacity-50' : ''}
            `}
            aria-label="Yêu thích"
          >
            <FaHeart size={18} className={isLiked ? 'drop-shadow-md' : ''} />
          </button>
        )}

        {tour.tourTypeName && (
          <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full capitalize shadow-sm">
            {tour.tourTypeName.toLowerCase().replace('tour ', '')}
          </div>
        )}

        {tour.discountPercentage > 0 && (
          <div className="absolute bottom-4 left-4 z-10 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            Giảm {tour.discountPercentage}%
          </div>
        )}
      </div>

      <div className="px-3 flex flex-col flex-grow">
        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-2 py-1 rounded-md font-medium">
            <FaStar />
            <span>{averageRating.toFixed(1)}</span>
            <span className="text-gray-400 text-xs ml-1">({reviewCount})</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <FaClock className="text-gray-400" />
            <span>{`${durationDays}N${durationNights}Đ`}</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors flex-grow">
          <Link to={`/tours/${safeId}`}>{tour.title}</Link>
        </h3>

        <div className="flex items-center text-sm text-gray-500 mb-4 font-medium">
          <FaMapMarkerAlt className="mr-2 text-blue-500" />
          <span className="truncate">{tour.destinationName || 'Đang cập nhật'}</span>
        </div>

        <div className="border-t border-gray-100 mb-4 w-full"></div>

        <div className="mt-auto">
          <div className="flex flex-col items-end justify-end mb-4">
            <span className="text-xs text-gray-400 font-medium uppercase mb-0.5">Giá chỉ từ</span>
            <div className="flex items-baseline gap-2">
              {hasDiscount && (
                <span className="text-gray-400 line-through text-sm font-medium">
                  {formatCurrency(priceAdult)}
                </span>
              )}
              <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                {formatCurrency(finalPrice)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              as="link"
              to={`/tours/${safeId}`}
              variant="outline"
              className="flex-1 !rounded-xl !py-2.5 !text-sm !font-semibold border-2 border-gray-200 hover:border-blue-600 hover:bg-blue-50"
            >
              Chi tiết
            </Button>
            <Button
              as="link"
              to={`/tours/${safeId}`}
              variant="solid"
              className="flex-1 !rounded-xl !py-2.5 !text-sm !font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
            >
              Đặt ngay
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
