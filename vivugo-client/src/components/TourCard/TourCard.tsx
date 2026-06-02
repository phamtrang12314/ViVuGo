import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import type { AxiosError } from 'axios'
import { motion } from 'framer-motion'
import { FaMapMarkerAlt, FaStar, FaClock, FaHeart, FaBolt } from 'react-icons/fa'
import { BusFront, Building2, Clock3, MapPin, UtensilsCrossed, CheckCircle2 } from 'lucide-react'
import type { Tour } from '../../types/tour'
import { formatCurrency, resolveAssetUrl } from '../../utils/utils'
import { buildTourImageSet } from '../../utils/tourVisuals'
import Button from '../Button'
import { AppContext } from '../../contexts/app.context'
import { favoriteApi } from '../../apis/favorite.api'

export type TourCardVariant = 'default' | 'featured' | 'trending' | 'deal'

const featuredServiceItems = [
  { icon: MapPin, label: 'Điểm đến', tone: 'bg-emerald-50 text-emerald-600' },
  { icon: Clock3, label: 'Thời lượng', tone: 'bg-blue-50 text-blue-600' },
  { icon: BusFront, label: 'Xe du lịch', tone: 'bg-amber-50 text-amber-600' },
  { icon: Building2, label: 'Khách sạn', tone: 'bg-violet-50 text-violet-600' },
  { icon: UtensilsCrossed, label: 'Ẩm thực', tone: 'bg-rose-50 text-rose-600' }
]

const toValidPrice = (value: unknown) => {
  const price = Number(value)
  return Number.isFinite(price) && price > 0 ? price : null
}

export default function TourCard({
  tour,
  isFavoritePage = false,
  variant = 'default'
}: {
  tour: Tour
  isFavoritePage?: boolean
  variant?: TourCardVariant
}) {
  const { isAuthenticated, favoriteIds, addFavoriteId, removeFavoriteId } = useContext(AppContext)
  const queryClient = useQueryClient()

  const safeId = tour.tourID || (tour as any).tourId || (tour as any).id || ''
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

  const imageSet = useMemo(() => buildTourImageSet(tour, 3), [tour])
  const displayImages = imageSet.slice(0, 3)
  const [isHovered, setIsHovered] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const isFeatured = variant === 'featured'
  const isTrending = variant === 'trending'
  const isDeal = variant === 'deal'

  useEffect(() => {
    if (displayImages.length <= 1) return
    if (!isFeatured && !isHovered) return
    const timer = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % displayImages.length)
    }, isFeatured ? 5000 : 1200)
    return () => window.clearInterval(timer)
  }, [isHovered, isFeatured, displayImages.length])

  const handleFavoriteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated) {
      toast.info('Bạn cần đăng nhập để thực hiện chức năng này')
      return
    }

    if (isLiked) {
      removeFavoriteMutation.mutate(safeId, {
        onSuccess: () => {
          removeFavoriteId(safeId)
          toast.success('Đã xóa khỏi danh sách yêu thích')
          queryClient.invalidateQueries({ queryKey: ['favoriteIds'] })
        },
        onError: () => toast.error('Có lỗi xảy ra, vui lòng thử lại')
      })
      return
    }

    addFavoriteMutation.mutate(
      { tourId: safeId },
      {
        onSuccess: () => {
          addFavoriteId(safeId)
          toast.success('Đã thêm tour vào danh sách yêu thích')
          queryClient.invalidateQueries({ queryKey: ['favoriteIds'] })
        },
        onError: (error: AxiosError | Error) => {
          const axiosError = error as AxiosError<{ message: string }>
          if (axiosError.response?.status === 409) {
            addFavoriteId(safeId)
            toast.info('Bạn đã yêu thích tour này rồi')
          } else {
            toast.error('Có lỗi xảy ra, vui lòng thử lại')
          }
        }
      }
    )
  }

  const featureHighlights = [
    'Tham quan các điểm đến nổi bật theo lịch trình.',
    'Lịch trình vừa phải, phù hợp gia đình và nhóm bạn.',
    'Hướng dẫn viên hỗ trợ xuyên suốt hành trình.'
  ]
  const itineraryHighlights = [
    `Ngày 1: Khám phá ${tour.destinationName || 'điểm đến chính'}`,
    `Ngày 2: Trải nghiệm địa phương và ẩm thực đặc sắc`
  ]

  const cardClass = [
    'group flex h-full flex-col border bg-white/82 p-3 shadow-[var(--vivugo-shadow)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)]',
    'rounded-[var(--vivugo-radius)]',
    isTrending ? 'border-amber-200/80 ring-2 ring-amber-400/30 hover:ring-amber-400/50' : 'border-gray-100',
    isFeatured ? 'md:min-h-[560px]' : ''
  ].join(' ')

  const imageHeight = isFeatured ? 'h-72 md:h-80' : 'h-60'

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.018 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cardClass}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative ${imageHeight} mb-4 overflow-hidden rounded-3xl`}>
        <Link to={`/tours/${safeId}`} className="block h-full w-full">
          <img
            src={resolveAssetUrl(displayImages[activeImageIndex] || imageSet[0], '/hero.jpg')}
            alt={tour.title}
            onError={(event) => {
              event.currentTarget.src = '/hero.jpg'
            }}
            className="h-full w-full transform object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

          <div className="absolute bottom-3 right-3 flex gap-1.5">
            {displayImages.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full transition ${index === activeImageIndex ? 'bg-white' : 'bg-white/45'}`}
              />
            ))}
          </div>

        </Link>

        {isTrending && (
          <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
            <FaBolt size={12} /> Trending
          </div>
        )}

        {!isFavoritePage && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleFavoriteClick}
            disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
            className={`absolute right-4 top-4 z-10 rounded-full bg-white/70 p-2.5 shadow-sm backdrop-blur-md transition-colors
              ${isLiked ? 'bg-white text-red-500' : 'text-gray-500 hover:bg-white hover:text-red-500'}
              ${addFavoriteMutation.isPending || removeFavoriteMutation.isPending ? 'cursor-not-allowed opacity-50' : ''}
            `}
            aria-label="Yêu thích"
          >
            <FaHeart size={18} className={isLiked ? 'animate-pulse' : ''} />
          </motion.button>
        )}

        {tour.tourTypeName && !isTrending && (
          <div className="absolute left-4 top-4 z-10 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-bold capitalize text-white shadow-sm backdrop-blur-md">
            {tour.tourTypeName.toLowerCase().replace('tour ', '')}
          </div>
        )}

        {tour.discountPercentage > 0 && (
          <div
            className={`absolute z-10 text-xs font-bold text-white shadow-lg ${
              isDeal
                ? 'clip-ribbon left-0 top-0 rounded-br-2xl bg-gradient-to-br from-red-600 to-rose-500 px-4 py-2'
                : 'bottom-4 left-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-3 py-1.5'
            }`}
          >
            {isDeal ? (
              <>
                <span className="block text-[10px] uppercase opacity-90">Ưu đãi</span>-{tour.discountPercentage}%
              </>
            ) : (
              <>Giảm {tour.discountPercentage}%</>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-grow flex-col px-3">
        <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-600">
            <FaStar />
            <span>{averageRating.toFixed(1)}</span>
            <span className="ml-1 text-xs text-gray-400">({reviewCount})</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <FaClock className="text-gray-400" />
            <span>{`${durationDays}N${durationNights}Đ`}</span>
          </div>
        </div>

        <h3
          className={`mb-2 line-clamp-2 font-bold leading-snug text-gray-900 transition-colors group-hover:text-blue-600 ${
            isFeatured ? 'text-xl md:text-2xl' : 'text-lg'
          }`}
        >
          <Link to={`/tours/${safeId}`}>{tour.title}</Link>
        </h3>

        {isFeatured && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-500">Thời lượng</p>
                <p className="text-lg font-black text-slate-900">
                  {durationDays} ngày {durationNights} đêm
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-500">Khởi hành</p>
                <p className="text-lg font-black text-slate-900 line-clamp-1">{tour.departurePlace || 'Đang cập nhật'}</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 rounded-2xl border border-slate-100 bg-white p-2.5">
              {featuredServiceItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="text-center">
                    <span className={`mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                      <Icon size={18} />
                    </span>
                    <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight text-slate-700">{item.label}</p>
                  </div>
                )
              })}
            </div>

            <p className="text-[15px] leading-relaxed text-slate-700">
              Khám phá hành trình nổi bật tại {tour.destinationName || 'điểm đến này'}, lịch trình rõ ràng và dịch vụ phù hợp cho cả gia đình.
            </p>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
              <p className="mb-2 text-sm font-black uppercase text-emerald-700">Điểm nổi bật</p>
              <ul className="space-y-1.5 text-sm text-emerald-900">
                {featureHighlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
              <p className="mb-2 text-sm font-black uppercase text-blue-700">Lịch trình</p>
              <ul className="space-y-1 text-sm font-semibold text-slate-800">
                {itineraryHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              {['Văn hóa', 'Di tích', 'Ẩm thực', 'Khởi hành hàng tuần'].map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center text-sm font-medium text-gray-500">
          <FaMapMarkerAlt className="mr-2 text-blue-500" />
          <span className="truncate">{tour.destinationName || 'Đang cập nhật'}</span>
        </div>

        <div className="mb-4 w-full border-t border-gray-100" />

        <div className="mt-auto">
          <div className="mb-4 flex flex-col items-end justify-end">
            <span className="mb-0.5 text-xs font-medium uppercase text-gray-400">Giá chỉ từ</span>
            <div className="flex items-baseline gap-2">
              {hasDiscount && <span className="text-sm font-medium text-gray-400 line-through">{formatCurrency(priceAdult)}</span>}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-extrabold text-transparent">
                {formatCurrency(finalPrice)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              as="link"
              to={`/tours/${safeId}`}
              variant="outline"
              className="flex-1 !rounded-xl !bg-white/70 !py-3 !text-sm !font-bold !text-slate-700 hover:!bg-white hover:!-translate-y-0.5"
            >
              Chi tiết
            </Button>
            <Button
              as="link"
              to={`/tours/${safeId}`}
              variant="solid"
              className="flex-1 !rounded-xl !bg-gradient-to-r !from-blue-600 !to-indigo-600 !py-3 !text-sm !font-black !text-white !shadow-[0_12px_26px_rgba(37,99,235,0.32)] hover:!-translate-y-0.5 hover:!scale-[1.02] hover:!from-blue-700 hover:!to-indigo-700 hover:!shadow-[0_18px_34px_rgba(37,99,235,0.42)]"
            >
              Đặt ngay
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
