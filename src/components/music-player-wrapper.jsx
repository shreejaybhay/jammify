"use client";

import { MusicPlayer } from "@/components/music-player";
import { useMusicPlayer } from "@/contexts/music-player-context";

export function MusicPlayerWrapper() {
  const { currentSong, playlist, isPlayerVisible, handleSongChange } = useMusicPlayer();

  // Always render MusicPlayer when there's a current song and player is visible
  // The MusicPlayer itself will handle hiding the bottom bar when fullscreen is open
  if (!isPlayerVisible || !currentSong) return null;

  return (
    <MusicPlayer
      currentSong={currentSong}
      playlist={playlist}
      onSongChange={handleSongChange}
    />
  );
}