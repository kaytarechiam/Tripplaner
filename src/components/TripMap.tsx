import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons for webpack/vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export interface MapLocation {
  id?: string
  title: string
  lat: number
  lng: number
  category?: string
  time?: string
}

interface TripMapProps {
  locations: MapLocation[]
  center?: [number, number]
  zoom?: number
  height?: string
  selectedId?: string
  onMarkerClick?: (location: MapLocation) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  hotel: '#3b82f6',
  landmark: '#8b5cf6',
  food: '#f97316',
  nature: '#22c55e',
  activity: '#ec4899',
  shopping: '#eab308',
  transport: '#64748b',
  default: '#667eea',
}

// Create a numbered marker icon
function createCustomIcon(lat: number, lng: number, index: number, color: string, isSelected: boolean) {
  const size = isSelected ? 48 : 40
  return L.divIcon({
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${color};
        border:3px solid white;
        box-shadow:0 4px 12px ${color}80;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:700;
        font-size:14px;
        cursor:pointer;
        transition:transform 0.2s;
        ${isSelected ? 'transform:scale(1.2);z-index:1000;' : ''}
      ">${index}</div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// Draw animated directional arrow between two points
function createDirectionArrow(from: L.LatLng, to: L.LatLng, map: L.Map) {
  const midLat = (from.lat + to.lat) / 2
  const midLng = (from.lng + to.lng) / 2
  const angle = Math.atan2(to.lat - from.lat, to.lng - from.lng) * (180 / Math.PI)

  const arrowIcon = L.divIcon({
    html: `<div style="
      width:0;height:0;
      border-left:8px solid transparent;
      border-right:8px solid transparent;
      border-bottom:16px solid #667eea;
      transform:rotate(${angle}deg);
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    "></div>`,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

  return L.marker([midLat, midLng], { icon: arrowIcon, interactive: false })
}

export function TripMap({
  locations,
  center,
  zoom = 12,
  height = '100%',
  selectedId,
  onMarkerClick,
}: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const polylinesRef = useRef<L.Polyline[]>([])
  const arrowMarkersRef = useRef<L.Marker[]>([])
  const markersRef = useRef<L.Marker[]>([])

  // Calculate center from locations if not provided
  const mapCenter: [number, number] = center || (locations.length > 0
    ? [locations[0].lat, locations[0].lng]
    : [-6.2, 106.8] // Jakarta default
  )

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom,
      zoomControl: true,
      attributionControl: true,
    })

    // Add free OSM tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers + route lines when locations change
  useEffect(() => {
    if (!mapInstance.current) return
    const map = mapInstance.current

    // Clear existing markers, polylines, arrows
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []
    polylinesRef.current.forEach(p => map.removeLayer(p))
    polylinesRef.current = []
    arrowMarkersRef.current.forEach(a => map.removeLayer(a))
    arrowMarkersRef.current = []

    if (locations.length === 0) return

    // Add markers
    locations.forEach((loc, i) => {
      const color = CATEGORY_COLORS[loc.category || ''] || CATEGORY_COLORS.default
      const isSelected = loc.id === selectedId
      const icon = createCustomIcon(loc.lat, loc.lng, i + 1, color, isSelected)

      const marker = L.marker([loc.lat, loc.lng], { icon })
        .bindPopup(`
          <div style="min-width:180px;font-family:Inter,sans-serif">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${loc.title}</div>
            ${loc.time ? `<div style="font-size:12px;color:#6b7280">${loc.time}</div>` : ''}
            ${loc.category ? `<div style="font-size:11px;color:${color};font-weight:600;text-transform:uppercase;margin-top:4px">${loc.category}</div>` : ''}
          </div>
        `)

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(loc))
      }

      marker.addTo(map)
      markersRef.current.push(marker)
    })

    // Draw route lines between consecutive markers
    if (locations.length >= 2) {
      const routeColor = '#667eea'
      for (let i = 0; i < locations.length - 1; i++) {
        const from = L.latLng(locations[i].lat, locations[i].lng)
        const to = L.latLng(locations[i + 1].lat, locations[i + 1].lng)

        // Main dashed route line
        const polyline = L.polyline([from, to], {
          color: routeColor,
          weight: 3,
          opacity: 0.8,
          dashArray: '8, 8',
          lineCap: 'round',
        }).addTo(map)
        polylinesRef.current.push(polyline)

        // Direction arrow at midpoint
        const arrow = createDirectionArrow(from, to, map)
        arrow.addTo(map)
        arrowMarkersRef.current.push(arrow)
      }

      // Fit bounds to show all markers
      const bounds = L.latLngBounds(locations.map(l => L.latLng(l.lat, l.lng)))
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], zoom)
    }
  }, [locations, selectedId, onMarkerClick, zoom])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: '16px', overflow: 'hidden' }}
      aria-label="Peta lokasi trip"
      role="application"
    />
  )
}
