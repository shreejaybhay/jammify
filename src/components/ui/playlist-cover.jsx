"use client";

import { useState } from "react";
import { Play } from "lucide-react";

export function PlaylistCover({
  playlist,
  className = "w-full aspect-square",
  showPlayIcon = true,
}) {
  const [imageErrors, setImageErrors] = useState({});

  // Get first 4 songs with images
  const songsWithImages =
    playlist?.songs
      ?.slice(0, 4)
      .filter(
        (song) =>
          song.image && Array.isArray(song.image) && song.image.length > 0
      ) || [];

  // Debug logging (only when there are issues)
  if (playlist?.songs?.length > 0 && songsWithImages.length === 0) {
    console.log("⚠️ Playlist has songs but no images:", {
      name: playlist.name,
      songsCount: playlist.songs.length,
      firstSong: playlist.songs[0],
    });
  }

  const handleImageError = (index) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const getImageUrl = (song) => {
    if (!song.image || !Array.isArray(song.image)) return null;

    // Try to get the best quality image
    const highQualityImage =
      song.image.find((img) => img.quality === "500x500") ||
      song.image.find((img) => img.quality === "150x150") ||
      song.image[song.image.length - 1];

    return highQualityImage?.url;
  };

  // If playlist has a custom image, use it
  if (playlist?.image && !imageErrors.customImage) {
    const imageUrl = Array.isArray(playlist.image)
      ? playlist.image.find((img) => img.quality === "500x500")?.url ||
        playlist.image.find((img) => img.quality === "150x150")?.url ||
        playlist.image[playlist.image.length - 1]?.url
      : playlist.image;

    if (imageUrl) {
      return (
        <div
          className={`${className} rounded-xl bg-muted overflow-hidden shadow-md group-hover:shadow-lg transition-shadow relative`}
        >
          <img
            src={imageUrl}
            alt={playlist.name || playlist.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => {
              // Fallback to collage if custom image fails
              setImageErrors({ customImage: true });
            }}
          />
          {showPlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          )}
        </div>
      );
    }
  }

  // If we have songs with images, create a collage
  if (songsWithImages.length > 0) {
    return (
      <div
        className={`${className} rounded-xl bg-muted overflow-hidden shadow-md group-hover:shadow-lg transition-shadow relative`}
      >
        {songsWithImages.length === 1 ? (
          // Single image - full cover
          <div className="w-full h-full">
            <img
              src={getImageUrl(songsWithImages[0])}
              alt={playlist.name || playlist.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={() => handleImageError(0)}
            />
          </div>
        ) : songsWithImages.length === 2 ? (
          // Two images - split vertically
          <div className="w-full h-full flex">
            {songsWithImages.slice(0, 2).map((song, index) => (
              <div key={index} className="w-1/2 h-full">
                <img
                  src={getImageUrl(song)}
                  alt={`Song ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={() => handleImageError(index)}
                />
              </div>
            ))}
          </div>
        ) : songsWithImages.length === 3 ? (
          // Three images - first one takes left half, other two split right half
          <div className="w-full h-full flex">
            <div className="w-1/2 h-full">
              <img
                src={getImageUrl(songsWithImages[0])}
                alt="Song 1"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                onError={() => handleImageError(0)}
              />
            </div>
            <div className="w-1/2 h-full flex flex-col">
              {songsWithImages.slice(1, 3).map((song, index) => (
                <div key={index + 1} className="w-full h-1/2">
                  <img
                    src={getImageUrl(song)}
                    alt={`Song ${index + 2}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={() => handleImageError(index + 1)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Four or more images - 2x2 grid
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-black">
            {songsWithImages.slice(0, 4).map((song, index) => (
              <div key={index} className="w-full h-full overflow-hidden">
                <img
                  src={getImageUrl(song)}
                  alt={`Song ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={() => handleImageError(index)}
                />
              </div>
            ))}
          </div>
        )}

        {showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        )}
      </div>
    );
  }

  // Fallback gradient when no images available
  return (
    <div
      className={`${className} rounded-xl bg-gradient-to-br from-green-500 to-blue-500 overflow-hidden shadow-md group-hover:shadow-lg transition-shadow relative flex items-center justify-center`}
    >
      <Play className="w-8 h-8 text-white/70" />
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
      )}
    </div>
  );
}
