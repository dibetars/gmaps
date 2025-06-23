import { useEffect, useState } from "react"

interface InventoryItem {
  Name: string
  Category: string
  Subcategory: string
  Restaurant: string
  imag: string
  price?: string
}

interface CurrentInventorySectionProps {
  onRestaurantClick?: (restaurant: string, items: InventoryItem[]) => void
}

const ITEMS_PER_PAGE = 5

export default function CurrentInventorySection({ onRestaurantClick }: CurrentInventorySectionProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [grouped, setGrouped] = useState<{ [key: string]: InventoryItem[] }>({})
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetch("https://api-server.krontiva.africa/api:uEBBwbSs/delika_pre_inventory")
      .then(res => res.json())
      .then(data => {
        setInventory(data)
        const groupedData: { [key: string]: InventoryItem[] } = {}
        data.forEach((item: InventoryItem) => {
          if (!groupedData[item.Restaurant]) groupedData[item.Restaurant] = []
          groupedData[item.Restaurant].push(item)
        })
        setGrouped(groupedData)
      })
  }, [])

  const restaurantNames = Object.keys(grouped)
  const totalPages = Math.ceil(restaurantNames.length / ITEMS_PER_PAGE)
  const paginatedRestaurants = restaurantNames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Current Inventory</h2>
      </div>
      {restaurantNames.length === 0 && <div>No inventory found.</div>}
      <div className="divide-y divide-gray-200">
        {paginatedRestaurants.map(restaurant => (
          <div
            key={restaurant}
            className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-100 rounded px-2"
            onClick={() => onRestaurantClick && onRestaurantClick(restaurant, grouped[restaurant])}
          >
            <span className="font-medium">{restaurant}</span>
            <span className="text-xs text-gray-500">{grouped[restaurant].length} items</span>
          </div>
        ))}
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="mx-2">Page {currentPage} of {totalPages}</span>
          <button
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
} 