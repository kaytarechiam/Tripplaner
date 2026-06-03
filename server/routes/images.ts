// server/routes/images.ts — Destination image search
// Priority: Pexels API → RapidAPI Google → empty fallback
import { Router } from "express";
import axios from "axios";

const router = Router();

// GET /api/images/search?q=Swiss+landscape
router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    res.status(400).json({ error: "q is required" });
    return;
  }

  // ── 1. Pexels API ────────────────────────────────────────
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const pexelsRes = await axios.get("https://api.pexels.com/v1/search", {
        params: {
          query: String(q),
          per_page: 6,
          orientation: "landscape",
        },
        headers: { Authorization: pexelsKey },
        timeout: 6000,
      });
      const photos: any[] = pexelsRes.data?.photos || [];
      if (photos.length > 0) {
        const images = photos
          .map((p: any) => ({
            url:
              p.src?.large2x ||
              p.src?.large ||
              p.src?.medium ||
              p.src?.original,
            thumbnail: p.src?.small || p.src?.tiny,
            title: p.alt || String(q),
          }))
          .filter((img: any) => img.url);
        res.json({ query: q, images, source: "pexels" });
        return;
      }
    } catch (err: any) {
      console.warn("[images] Pexels failed:", err?.message);
    }
  }

  // ── 2. RapidAPI Google Image Search ──────────────────────
  const rapidKey = process.env.RAPIDAPI_GOOGLE_KEY;
  const rapidHost =
    process.env.RAPIDAPI_GOOGLE_HOST || "google-api31.p.rapidapi.com";

  if (rapidKey) {
    const endpoints = [
      "/imagesearch",
      "/search/images",
      "/v1/imagesearch",
      "/search",
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`https://${rapidHost}${endpoint}`, {
          params: { q, hl: "en", gl: "id", num: 6 },
          headers: {
            "x-rapidapi-host": rapidHost,
            "x-rapidapi-key": rapidKey,
          },
          timeout: 8000,
        });

        const raw = response.data;
        let rawImages: any[] = [];

        if (Array.isArray(raw)) rawImages = raw;
        else if (Array.isArray(raw.images)) rawImages = raw.images;
        else if (Array.isArray(raw.items)) rawImages = raw.items;
        else if (Array.isArray(raw.image_results))
          rawImages = raw.image_results;
        else if (raw.data && Array.isArray(raw.data.images))
          rawImages = raw.data.images;

        if (rawImages.length > 0) {
          const images = rawImages
            .slice(0, 6)
            .map((img: any) => ({
              url:
                img.url ||
                img.original ||
                img.link ||
                img.imageUrl ||
                img.image?.url,
              thumbnail:
                img.thumbnail?.src ||
                img.thumbnailLink ||
                img.thumbnail ||
                img.url,
              title: img.title || String(q),
            }))
            .filter((img: any) => img.url);

          if (images.length > 0) {
            res.json({ query: q, images, source: "rapidapi" });
            return;
          }
        }
      } catch {
        continue;
      }
    }
  }

  // ── 3. No API keys configured ────────────────────────────
  res.json({ query: q, images: [], isMock: true });
});

export default router;
