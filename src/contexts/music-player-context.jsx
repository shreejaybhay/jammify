"use client";

import { createContext, useContext, useState } from "react";

const MusicPlayerContext = createContext();

export function MusicPlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const playSong = (song, songList = []) => {
    setCurrentSong(song);
    setPlaylist(songList);
    setIsPlayerVisible(true);
    setIsPlaying(true);
  };

  const handleSongChange = (song, index) => {
    setCurrentSong(song);
  };

  const clearPlayer = () => {
    setCurrentSong(null);
    setPlaylist([]);
    setIsPlayerVisible(false);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        playlist,
        isPlayerVisible,
        isPlaying,
        playSong,
        handleSongChange,
        clearPlayer,
        togglePlayPause,
        setIsPlaying,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}