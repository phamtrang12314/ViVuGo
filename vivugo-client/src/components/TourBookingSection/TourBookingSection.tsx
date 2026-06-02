import { useContext, useMemo, useState } from 'react'
import { Calendar, Minus, Phone, Plus, Users } from 'lucide-react'
import { toast } from 'react-toastify'
import type { TourDetails } from '../../types/tour'
import { formatCurrency } from '../../utils/utils'
import Button from '../Button'
import BookingModal from '../BookingModal'
import { AppContext } from '../../contexts/app.context'

interface Props {
  tour: TourDetails
}

const DATE_COUNT = 6

const buildDepartureDates = (startDate: string, openDates?: string[]) => {
  if (openDates && openDates.length > 0) {
    const parsed = openDates
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    if (parsed.length > 0) {
      return parsed
    }
  }

  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return [startDate]
  return Array.from({ length: DATE_COUNT }, (_, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index * 14)
    return date
  })
}

const formatDateLabel = (date: Date | string) => {
  if (typeof date === 'string') return date
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

const toValidPrice = (value: unknown) => {
  const price = Number(value)
  return Number.isFinite(price) && price > 0 ? price : null
}

export default function TourBookingSection({ tour }: Props) {
  const { isAuthenticated } = useContext(AppContext)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)

  const maxParticipants = Math.max(tour.maxParticipants || 1, 1)
  const remainingSlots = Math.max(maxParticipants - (adults + children), 0)
  const departureDates = useMemo(
    () => buildDepartureDates(tour.startDate, tour.openDates),
    [tour.startDate, tour.openDates]
  )
  const adultPrice = toValidPrice(tour.finalPriceAdult) || toValidPrice(tour.priceAdult) || 0
  const childPrice = toValidPrice(tour.finalPriceChild) || toValidPrice(tour.priceChild) || 0
  const totalPrice = adults * adultPrice + children * childPrice

  const increaseAdults = () => {
    setAdults((current) => (current + children >= maxParticipants ? current : current + 1))
  }

  const decreaseAdults = () => {
    setAdults((current) => Math.max(1, current - 1))
  }

  const increaseChildren = () => {
    setChildren((current) => (adults + current >= maxParticipants ? current : current + 1))
  }

  const decreaseChildren = () => {
    setChildren((current) => Math.max(0, current - 1))
  }

  const handleOpenBookingModal = () => {
    if (!isAuthenticated) {
      toast.info('Bạn vui lòng đăng nhập để đặt tour nhé!')
      return
    }
    if (adults < 1) {
      toast.error('Cần ít nhất 1 người lớn để đặt tour.')
      return
    }
    setIsModalOpen(true)
  }

  const selectedDate = departureDates[selectedDateIndex] || departureDates[0] || tour.startDate

  return (
    <div id="booking-panel" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#0f3a8a] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Giá từ</p>
        <p className="mt-1 text-4xl font-black leading-none">{formatCurrency(adultPrice)}</p>
        <p className="mt-3 text-sm text-blue-100">Mã tour: {tour.tourID}</p>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Ngày khởi hành</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {departureDates.map((date, index) => (
              <button
                type="button"
                key={`${String(date)}-${index}`}
                onClick={() => setSelectedDateIndex(index)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                  index === selectedDateIndex
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {formatDateLabel(date)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Số người</p>
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Người lớn</p>
                <p className="text-xs text-slate-500">{formatCurrency(adultPrice)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={decreaseAdults} className="rounded-full border border-slate-200 p-1 hover:bg-slate-50">
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm font-bold">{adults}</span>
                <button type="button" onClick={increaseAdults} className="rounded-full border border-slate-200 p-1 hover:bg-slate-50">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Trẻ em</p>
                <p className="text-xs text-slate-500">{formatCurrency(childPrice)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={decreaseChildren} className="rounded-full border border-slate-200 p-1 hover:bg-slate-50">
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm font-bold">{children}</span>
                <button type="button" onClick={increaseChildren} className="rounded-full border border-slate-200 p-1 hover:bg-slate-50">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <div className="mb-1 flex items-center gap-2">
            <Calendar size={16} className="text-slate-500" />
            <span>{typeof selectedDate === 'string' ? selectedDate : selectedDate.toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <span>Còn {remainingSlots} chỗ</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>
              Người lớn x {adults} + Trẻ em x {children}
            </span>
            <span className="font-semibold text-slate-800">{formatCurrency(totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-xl font-black text-slate-900">
            <span>Tổng cộng</span>
            <span className="text-blue-700">{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        <Button
          type="button"
          className="w-full !rounded-xl !bg-blue-600 !py-3 !font-black !text-white hover:!bg-blue-700"
          onClick={handleOpenBookingModal}
        >
          Đặt tour ngay
        </Button>
        <Button type="button" variant="outline" className="w-full !rounded-xl !border-blue-200 !py-3 !font-bold !text-blue-600">
          Tư vấn miễn phí
        </Button>

        <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Phone size={14} />
          Hotline: 1900 1808
        </p>
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tour={tour}
        bookingDetails={{
          adults,
          children,
          totalPrice
        }}
      />
    </div>
  )
}
