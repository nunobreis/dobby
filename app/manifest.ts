import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dobby's Health Tracker",
    short_name: "Dobby",
    description: "Track Dobby's health, vaccinations, and milestones",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#EFEFEF",
    theme_color: "#8B5CF6",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
