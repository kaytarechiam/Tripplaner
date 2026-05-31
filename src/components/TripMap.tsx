import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getRoute } from '../lib/api'

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
  accommodation: '#3b82f6',
  landmark: '#8b5cf6',
  attraction: '#8b5cf6',
  food: '#f97316',
  nature: '#22c55e',
  activity: '#ec4899',
  shopping: '#eab308',
  transport: '#64748b',
  default: '#667eea',
}

function createCustomIcon(index: number, color: string, isSelected: boolean) {
  const size = isSelected ? 48 : 40
  return L.divIcon({
    html: `
      <div style="
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:${color};
        border:3px solid white;
        box-shadow:0 4px 12px ${color}80;
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:700;font-size:14px;
        cursor:pointer;
        ${isSelected ? 'transform:scale(1.2);z-index:1000;outline:3px solid white;' : ''}
      ">${index}</div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
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
  const polylinesRef = useRef<L.Layer[]>([])
  const markersRef = useRef<L.Marker[]>([])
  const [routeLoading, setRouteLoading] = useState(false)

  // Calculate center from locations if not provided
  const mapCenter: [number, number] = center || (locations.length > 0
    ? [locations[0].lat, locations[0].lng]
    : [-6.2, 106.8] // Jakarta default
  )

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom,
      zoomControl: true,
      attributionControl: true,
    })

    // OpenStreetMap tiles — free, no API key
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

  // Update markers + route when locations change
  useEffect(() => {
    if (!mapInstance.current) return
    const map = mapInstance.current

    // Clear existing layers
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []
    polylinesRef.current.forEach(p => map.removeLayer(p))
    polylinesRef.current = []

    if (locations.length === 0) return

    // Add numbered markers
    locations.forEach((loc, i) => {
      const color = CATEGORY_COLORS[loc.category || ''] || CATEGORY_COLORS.default
      const isSelected = loc.id === selectedId
      const icon = createCustomIcon(i + 1, color, isSelected)

      const marker = L.marker([loc.lat, loc.lng], { icon })
        .bindPopup(`
          <div style="min-width:180px;font-family:Inter,sans-serif">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${i + 1}. ${loc.title}</div>
            ${loc.time ? `<div style="font-size:12px;color:#6b7280">🕐 ${loc.time}</div>` : ''}
            ${loc.category ? `<div style="font-size:11px;color:${color};font-weight:600;text-transform:uppercase;margin-top:4px">${loc.category}</div>` : ''}
          </div>
        `)

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(loc))
      }

      marker.addTo(map)
      markersRef.current.push(marker)
    })

    // Fit bounds
    if (locations.length >= 2) {
      const bounds = L.latLngBounds(locations.map(l => L.latLng(l.lat, l.lng)))
      map.fitBounds(bounds, { padding: [60, 60] })

      // Fetch OSRM road route
      const fetchRoute = async () => {
        setRouteLoading(true)
        const routeResult = await getRoute(locations.map(l => ({ lat: l.lat, lng: l.lng })))

        if (!mapInstance.current) return

        if (routeResult?.geometry?.coordinates?.length) {
          // Draw real road route — OSRM coords are [lng, lat], Leaflet needs [lat, lng]
          const latlngs = routeResult.geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng))

          // Outer glow line
          const glowLine = L.polyline(latlngs, {
            color: '#667eea',
            weight: 6,
            opacity: 0.3,
          }).addTo(map)
          polylinesRef.current.push(glowLine)

          // Main route line
          const mainLine = L.polyline(latlngs, {
            color: '#667eea',
            weight: 3,
            opacity: 0.9,
          }).addTo(map)
          polylinesRef.current.push(mainLine)

          // Distance labels between each leg
          routeResult.legs.forEach((leg, i) => {
            if (i >= locations.length - 1) return
            const from = locations[i]
            const to = locations[i + 1]
            const midLat = (from.lat + to.lat) / 2
            const midLng = (from.lng + to.lng) / 2

            const label = L.divIcon({
              html: `<div style="
                background: rgba(102,126,234,0.9);
                color: white;
                border-radius: 12px;
                padding: 3px 8px;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                font-family: Inter, sans-serif;
              ">🚗 ${leg.distance_km} km · ${leg.duration_min} mnt</div>`,
              className: '',
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })
            const labelMarker = L.marker([midLat, midLng], { icon: label, interactive: false })
            labelMarker.addTo(map)
            polylinesRef.current.push(labelMarker as any)
          })

          // Total distance label at bottom
          if (routeResult.total_distance_km && locations.length > 1) {
            const lastLoc = locations[locations.length - 1]
            const totalLabel = L.divIcon({
              html: `<div style="
                background: rgba(16,185,129,0.95);
                color: white;
                border-radius: 12px;
                padding: 4px 10px;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                font-family: Inter, sans-serif;
              ">📍 Total: ${routeResult.total_distance_km} km</div>`,
              className: '',
              iconSize: [0, 0],
              iconAnchor: [0, -20],
            })
            const totalMarker = L.marker([lastLoc.lat, lastLoc.lng], { icon: totalLabel, interactive: false })
            totalMarker.addTo(map)
            polylinesRef.current.push(totalMarker as any)
          }
        } else {
          // Fallback: straight dashed lines if OSRM fails
          for (let i = 0; i < locations.length - 1; i++) {
            const from = L.latLng(locations[i].lat, locations[i].lng)
            const to = L.latLng(locations[i + 1].lat, locations[i + 1].lng)
            const line = L.polyline([from, to], {
              color: '#667eea',
              weight: 2,
              opacity: 0.6,
              dashArray: '8, 8',
            }).addTo(map)
            polylinesRef.current.push(line)
          }
        }
        setRouteLoading(false)
      }

      fetchRoute()
    } else if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], zoom)
    }
  }, [locations, selectedId, onMarkerClick, zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', borderRadius: '16px', overflow: 'hidden' }}
        aria-label="Peta lokasi trip"
        role="application"
      />
      {routeLoading && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(102,126,234,0.9)',
          color: 'white',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 700,
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none',
        }}>
          🗺️ Menghitung rute...
        </div>
      )}
    </div>
  )
}
