"use client";

import { MusicPlayer } from "@/components/music-player";
import { useMusicPlayer } from "@/contexts/music-player-context";

export function MusicPlayerWrapper() {
  const { currentSong, playlist, isPlayerVisible, handleSongChange } = useMusicPlayer();

  if (!isPlayerVisible) return null;

  return (
    <MusicPlayer
      currentSong={currentSong}
      playlist={playlist}
      onSongChange={handleSongChange}
    />
  );
}