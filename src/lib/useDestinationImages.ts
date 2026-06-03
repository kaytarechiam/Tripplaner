// src/lib/useDestinationImages.ts
// Shared hook for resolving destination photos.
// Layer 1: Static Unsplash map (instant, no API call)
// Layer 2: Backend image search API (Pexels → RapidAPI) for misses
// Layer 3: Gradient fallback (handled in the component)

import { useState, useEffect } from "react";
import { searchImages } from "./api";

// ─── Static map ─────────────────────────────────────────────
// Curated Unsplash photos — works without any API key.
const STATIC: Record<string, string> = {
  // ── Indonesia ──────────────────────────────────────────
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  lombok: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80",
  jakarta: "https://images.unsplash.com/photo-1558636508-e0db3813bd1d?w=800&q=80",
  bandung: "https://images.unsplash.com/photo-1617871196891-2b6e44e6b6a6?w=800&q=80",
  yogyakarta: "https://images.unsplash.com/photo-1568402102990-bc541580a0d5?w=800&q=80",
  jogja: "https://images.unsplash.com/photo-1568402102990-bc541580a0d5?w=800&q=80",
  surabaya: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  semarang: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
  malang: "https://images.unsplash.com/photo-1570459027562-4a916cc6111f?w=800&q=80",
  raja_ampat: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80",
  komodo: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
  labuan_bajo: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
  flores: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  nusa_penida: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  ubud: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  kuta: "https://images.unsplash.com/photo-1570459027562-4a916cc6111f?w=800&q=80",
  bromo: "https://images.unsplash.com/photo-1580057573934-bfd0f7b29e40?w=800&q=80",
  medan: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  makassar: "https://images.unsplash.com/photo-1577906096429-f73b2c38e82c?w=800&q=80",
  manado: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80",
  papua: "https://images.unsplash.com/photo-1550952726624-21fbba5bab6e?w=800&q=80",
  kalimantan: "https://images.unsplash.com/photo-1550997802-5568-40ae6a0be7e4?w=800&q=80",
  sulawesi: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80",
  aceh: "https://images.unsplash.com/photo-1550431476-8c80b0a3e6be?w=800&q=80",
  padang: "https://images.unsplash.com/photo-1550431476-8c80b0a3e6be?w=800&q=80",
  solo: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80",
  bogor: "https://images.unsplash.com/photo-1570459027562-4a916cc6111f?w=800&q=80",
  batam: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
  bintan: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  belitung: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",

  // ── Southeast Asia ─────────────────────────────────────
  thailand: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
  bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80",
  chiang_mai: "https://images.unsplash.com/photo-1534008897995-27a23e859048?w=800&q=80",
  phuket: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
  malaysia: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80",
  kuala_lumpur: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80",
  vietnam: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  hanoi: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  ho_chi_minh: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
  philippines: "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?w=800&q=80",
  manila: "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?w=800&q=80",
  boracay: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  cambodia: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  siem_reap: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  myanmar: "https://images.unsplash.com/photo-1576086213369-c5b79156bb57?w=800&q=80",

  // ── East Asia ──────────────────────────────────────────
  japan: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
  jepang: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
  kyoto: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  osaka: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80",
  korea: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80",
  seoul: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80",
  china: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80",
  beijing: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80",
  shanghai: "https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?w=800&q=80",
  hongkong: "https://images.unsplash.com/photo-1576788589893-9d2df0c4dcc1?w=800&q=80",
  hong_kong: "https://images.unsplash.com/photo-1576788589893-9d2df0c4dcc1?w=800&q=80",
  taiwan: "https://images.unsplash.com/photo-1505737526555-b47b5f540b79?w=800&q=80",
  macau: "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800&q=80",

  // ── South Asia ─────────────────────────────────────────
  india: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80",
  new_delhi: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80",
  mumbai: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80",
  goa: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  nepal: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  maldives: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80",
  srilanka: "https://images.unsplash.com/photo-1502920514313-52581002a659?w=800&q=80",
  sri_lanka: "https://images.unsplash.com/photo-1502920514313-52581002a659?w=800&q=80",

  // ── Middle East ────────────────────────────────────────
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
  abu_dhabi: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
  turki: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
  turkey: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
  istanbul: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
  cappadocia: "https://images.unsplash.com/photo-1530088001779-b0e1d8fa25f2?w=800&q=80",
  jordan: "https://images.unsplash.com/photo-1580834341580-8c17a3a630ca?w=800&q=80",
  petra: "https://images.unsplash.com/photo-1580834341580-8c17a3a630ca?w=800&q=80",

  // ── Europe ─────────────────────────────────────────────
  swiss: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  switzerland: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  zurich: "https://images.unsplash.com/photo-1573108724029-4c46571d6490?w=800&q=80",
  geneva: "https://images.unsplash.com/photo-1573108724029-4c46571d6490?w=800&q=80",
  interlaken: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  france: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  italy: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80",
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80",
  venice: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80",
  milan: "https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=800&q=80",
  amalfi: "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=800&q=80",
  uk: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
  edinburgh: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  germany: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80",
  berlin: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80",
  munich: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80",
  netherlands: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=800&q=80",
  amsterdam: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=800&q=80",
  spain: "https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=800&q=80",
  barcelona: "https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=800&q=80",
  madrid: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&q=80",
  portugal: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
  lisbon: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
  greece: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
  santorini: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
  athens: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80",
  austria: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80",
  vienna: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80",
  czech: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&q=80",
  prague: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&q=80",
  croatia: "https://images.unsplash.com/photo-1555990538-1posit?w=800&q=80",
  dubrovnik: "https://images.unsplash.com/photo-1555990538-1positional?w=800&q=80",
  iceland: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=80",
  norway: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
  sweden: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=800&q=80",
  finland: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
  denmark: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80",
  copenhagen: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80",
  poland: "https://images.unsplash.com/photo-1562832135-14a35d25edef?w=800&q=80",
  krakow: "https://images.unsplash.com/photo-1562832135-14a35d25edef?w=800&q=80",
  hungary: "https://images.unsplash.com/photo-1565963975-b9537f845e88?w=800&q=80",
  budapest: "https://images.unsplash.com/photo-1565963975-b9537f845e88?w=800&q=80",
  scotland: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",

  // ── Americas ───────────────────────────────────────────
  usa: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&q=80",
  new_york: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80",
  los_angeles: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&q=80",
  miami: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=800&q=80",
  las_vegas: "https://images.unsplash.com/photo-1581351721010-8cf859cb14e4?w=800&q=80",
  hawaii: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  canada: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80",
  toronto: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80",
  vancouver: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&q=80",
  brazil: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80",
  rio: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80",
  peru: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
  machu_picchu: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
  mexico: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80",
  cancun: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80",

  // ── Africa & Oceania ───────────────────────────────────
  australia: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&q=80",
  sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80",
  melbourne: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800&q=80",
  new_zealand: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80",
  africa: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80",
  morocco: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80",
  marrakech: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80",
  egypt: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80",
  cairo: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80",
  kenya: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80",
  tanzania: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80",
};

// ─── Module-level cache for API results ───────────────────
const dynamicCache = new Map<string, string>();

// ─── Static lookup ────────────────────────────────────────
export function getStaticDestinationImage(destination: string): string | null {
  if (!destination) return null;
  const key = destination
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  // Exact match
  if (STATIC[key]) return STATIC[key];

  // Partial match: key contains a static keyword
  for (const [k, url] of Object.entries(STATIC)) {
    if (key.includes(k) || k.includes(key)) return url;
  }

  return null;
}

// ─── Hook ─────────────────────────────────────────────────
export function useDestinationImages(
  destinations: string[],
): Record<string, string> {
  const [images, setImages] = useState<Record<string, string>>({});

  // Stable key to detect actual changes
  const depsKey = destinations.join("|||");

  useEffect(() => {
    if (destinations.length === 0) return;

    const initial: Record<string, string> = {};
    const toFetch: string[] = [];

    for (const dest of destinations) {
      if (!dest) continue;
      const staticImg = getStaticDestinationImage(dest);
      if (staticImg) {
        initial[dest] = staticImg;
      } else if (dynamicCache.has(dest)) {
        initial[dest] = dynamicCache.get(dest)!;
      } else {
        toFetch.push(dest);
      }
    }

    // Immediately show static + cached images
    setImages(initial);

    if (toFetch.length === 0) return;

    // Deduplicate and cap concurrent requests
    const unique = [...new Set(toFetch)].slice(0, 10);

    Promise.allSettled(
      unique.map(async (dest) => {
        try {
          const imgs = await searchImages(`${dest} travel landscape`);
          if (imgs.length > 0 && imgs[0].url) {
            dynamicCache.set(dest, imgs[0].url);
            return [dest, imgs[0].url] as [string, string];
          }
        } catch {
          // silently ignore
        }
        return null;
      }),
    ).then((results) => {
      const updates: Record<string, string> = {};
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          updates[r.value[0]] = r.value[1];
        }
      }
      if (Object.keys(updates).length > 0) {
        setImages((prev) => ({ ...prev, ...updates }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  return images;
}
