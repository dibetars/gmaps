import React, { useEffect } from "react"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/loading-spinner"

interface InventoryModalProps {
  open: boolean
  onClose: () => void
  item?: any // InventoryItem type
  editMode?: boolean
}

interface Item {
  id: string
  Name: string
  Category: string
  Subcategory: string
  image: { url: string }
  price?: string
}

export default function InventoryModal({ open, onClose, item, editMode }: InventoryModalProps) {
  const [step, setStep] = useState(1)
  const [restaurantName, setRestaurantName] = useState("")
  const [uploadedBy, setUploadedBy] = useState("")
  const [contactName, setContactName] = useState("")
  const [momoNumber, setMomoNumber] = useState("")
  const [email, setEmail] = useState("")
  const [items, setItems] = useState<Item[]>([])
  const [selectedItems, setSelectedItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  // Prefill fields if editing
  useEffect(() => {
    if (editMode && item) {
      setRestaurantName(item.Restaurant || "")
      setContactName(item.contactName || "")
      setMomoNumber(item.momoNumber || "")
      setEmail(item.email || "")
      setSelectedItems([{ ...item, image: { url: item.image.url }, price: item.price }])
      setStep(1)
    } else if (!open) {
      setRestaurantName("")
      setUploadedBy("")
      setContactName("")
      setMomoNumber("")
      setEmail("")
      setSelectedItems([])
      setItems([])
      setProgress(0)
      setStep(1)
    }
  }, [editMode, item, open])

  // Fetch items from API
  async function fetchItems() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("https://api-server.krontiva.africa/api:uEBBwbSs/GetInv")
      const data = await res.json()
      setItems(data)
    } catch (e) {
      setError("Failed to fetch items.")
    }
    setLoading(false)
  }

  // Handle select item and price
  function handleSelectItem(item: Item) {
    const price = prompt(`Enter price for ${item.Name}`)
    if (price) {
      setSelectedItems(prev => [...prev, { ...item, price }])
    }
  }

  // Handle submit (add or edit)
  async function handleSubmit() {
    setLoading(true)
    setProgress(0)
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i]
      const body = new FormData()
      body.append("Name", item.Name)
      body.append("Category", item.Category)
      body.append("Subcategory", item.Subcategory)
      body.append("Restaurant", restaurantName)
      body.append("price", item.price || "")
      body.append("email", email)
      body.append("momoNumber", momoNumber)
      body.append("contactName", contactName)
      // If image is a URL, fetch and convert to File
      const response = await fetch(item.image?.url)
      const blob = await response.blob()
      const file = new File([blob], item.Name + ".png", { type: blob.type })
      body.append("photoUpload", file)
      await fetch("https://api-server.krontiva.africa/api:uEBBwbSs/delika_pre_inventory", {
        method: "POST",
        body
      })
      setProgress(Math.round(((i + 1) / selectedItems.length) * 100))
    }
    setLoading(false)
    setStep(1)
    setRestaurantName("")
    setUploadedBy("")
    setContactName("")
    setMomoNumber("")
    setEmail("")
    setSelectedItems([])
    setItems([])
    setProgress(0)
    onClose()
    window.location.reload()
  }

  // Step 2: fetch items on step change
  React.useEffect(() => {
    if (step === 2 && items.length === 0 && !editMode) fetchItems()
  }, [step, editMode])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[70vw] max-w-5xl z-50 bg-white p-6 rounded-lg shadow-lg border">
        <button className="float-right" onClick={onClose}>×</button>
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Step 1: Prelim Data</h2>
            <input
              className="border p-2 mb-2 w-full"
              placeholder="Restaurant Name"
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              disabled={editMode}
            />
            <input
              className="border p-2 mb-2 w-full"
              placeholder="Uploaded by"
              value={uploadedBy}
              onChange={e => setUploadedBy(e.target.value)}
              disabled={editMode}
            />
            <input
              className="border p-2 mb-2 w-full"
              placeholder="Contact Person's Name"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              disabled={editMode}
            />
            <input
              className="border p-2 mb-2 w-full"
              placeholder="Momo Number"
              value={momoNumber}
              onChange={e => setMomoNumber(e.target.value)}
              disabled={editMode}
            />
            <input
              className="border p-2 mb-4 w-full"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={editMode}
            />
            <button
              className="bg-primary text-white px-4 py-2 rounded"
              onClick={() => setStep(2)}
              disabled={!restaurantName || !contactName || !momoNumber || !email}
            >
              Next
            </button>
          </div>
        )}
        {step === 2 && !editMode && (
          <div>
            <h2 className="text-xl font-bold mb-4">Step 2: Search & Add Items</h2>
            <input
              className="border p-2 mb-2 w-full"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {loading && <LoadingSpinner />}
            {error && <div className="text-red-500">{error}</div>}
            <div className="max-h-64 overflow-y-auto mb-4">
              {items.filter(item => item.Name.toLowerCase().includes(search.toLowerCase())).map(item => (
                <div key={item.id} className="flex items-center gap-4 border-b py-2">
                  <img src={item.image.url} alt={item.Name} className="w-12 h-12 object-cover rounded" />
                  <div className="flex-1">
                    <div className="font-semibold">{item.Name}</div>
                    <div className="text-xs text-gray-500">{item.Category} &gt; {item.Subcategory}</div>
                  </div>
                  <button
                    className="bg-primary text-white px-2 py-1 rounded"
                    onClick={() => handleSelectItem(item)}
                    disabled={selectedItems.some(si => si.id === item.id)}
                  >
                    {selectedItems.some(si => si.id === item.id) ? "Added" : "Add"}
                  </button>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <h3 className="font-bold mb-2">Selected Items</h3>
              {selectedItems.length === 0 && <div className="text-gray-500">No items selected.</div>}
              {selectedItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span>{item.Name}</span>
                  <span className="text-gray-400">({item.price})</span>
                </div>
              ))}
            </div>
            <button
              className="bg-primary text-white px-4 py-2 rounded mr-2"
              onClick={handleSubmit}
              disabled={selectedItems.length === 0 || loading}
            >
              Submit
            </button>
            <button
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </button>
            {loading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="text-xs text-gray-500">Uploading... {progress}%</div>
              </div>
            )}
          </div>
        )}
        {step === 1 && editMode && (
          <div>
            <h2 className="text-xl font-bold mb-4">Inventory Item Details</h2>
            <div className="mb-4">
              <div className="font-semibold">Name: {selectedItems[0]?.Name}</div>
              <div className="text-sm text-gray-500">Category: {selectedItems[0]?.Category}</div>
              <div className="text-sm text-gray-500">Subcategory: {selectedItems[0]?.Subcategory}</div>
              <div className="text-sm text-gray-500">Restaurant: {restaurantName}</div>
              <div className="text-sm text-gray-500">Contact: {contactName}</div>
              <div className="text-sm text-gray-500">Momo Number: {momoNumber}</div>
              <div className="text-sm text-gray-500">Email: {email}</div>
              <div className="text-sm text-gray-500">Price: ₵{selectedItems[0]?.price}</div>
            </div>
            <button
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 