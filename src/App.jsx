import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

// Helper function to format time in MM:SS
const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds === Infinity) {
    return '00:00';
  }
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Composant principal de l'application
export default function App() {
  // State pour la playlist
  const [playlist, setPlaylist] = useState([]);
  // State pour l'index du morceau actuel
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  // State pour l'état de lecture
  const [isPlaying, setIsPlaying] = useState(false);
  // State pour la durée totale du morceau
  const [duration, setDuration] = useState(0);
  // State pour le temps de lecture actuel
  const [currentTime, setCurrentTime] = useState(0);
  // State pour le volume (0 à 1)
  const [volume, setVolume] = useState(0.75); // Default volume at 75%
  // State pour l'état muet
  const [isMuted, setIsMuted] = useState(false);
  // State pour les erreurs
  const [error, setError] = useState(null);
  // State pour le chargement initial
  const [isLoading, setIsLoading] = useState(true);

  // Référence à l'élément audio
  const audioRef = useRef(null);
  // Référence à la barre de progression (input range)
  const progressBarRef = useRef(null);

  // --- Effets ---

  // Load playlist on mount
  useEffect(() => {
    fetch('/playlist.json') // Assurez-vous que ce chemin est correct
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - Vérifiez /public/playlist.json`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          setPlaylist(data);
        } else {
          // Handle empty but valid JSON playlist
           setPlaylist([]); // Set to empty array instead of throwing error immediately
           console.warn("La playlist est vide ou le format est incorrect.");
        }
        setIsLoading(false);
      })
      .catch(fetchError => {
        console.error("Erreur lors du chargement de la playlist:", fetchError);
        setError(`Impossible de charger la playlist. Erreur: ${fetchError.message}`);
        setIsLoading(false);
      });
  }, []);

  // Handle audio play/pause based on isPlaying state
   useEffect(() => {
    if (!audioRef.current || playlist.length === 0) return;

    const audioElement = audioRef.current;

    if (isPlaying) {
      audioElement.play().catch(playError => {
        console.error("Erreur lors de la lecture:", playError);
        setError(`Erreur de lecture: ${playError.message}`);
        setIsPlaying(false); // Stop trying to play if it fails
      });
    } else {
      audioElement.pause();
    }
  }, [isPlaying, currentTrackIndex, playlist]); // Re-run if isPlaying or track changes

   // Update audio volume when volume state changes
   useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);


  // --- Handlers ---

  // Toggle play/pause state
  const togglePlayPause = useCallback(() => {
    if (playlist.length === 0 || !playlist[currentTrackIndex]?.mp3) {
        setError("Aucun morceau à jouer ou fichier MP3 manquant.");
        return;
    }; // Do nothing if playlist empty or no mp3 source
    setIsPlaying(prev => !prev);
  }, [playlist, currentTrackIndex]);

  // Play next track
  const playNextTrack = useCallback(() => {
    if (playlist.length === 0) return;
    const newIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(newIndex);
    // Reset time and potentially auto-play
    setCurrentTime(0);
    if (progressBarRef.current) progressBarRef.current.value = 0;
    // Keep playing if it was already playing, otherwise stay paused
    // setIsPlaying(true); // Uncomment to auto-play next track
  }, [currentTrackIndex, playlist.length]);

  // Play previous track
  const playPrevTrack = useCallback(() => {
    if (playlist.length === 0) return;
    const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(newIndex);
     // Reset time and potentially auto-play
    setCurrentTime(0);
    if (progressBarRef.current) progressBarRef.current.value = 0;
    // Keep playing if it was already playing, otherwise stay paused
    // setIsPlaying(true); // Uncomment to auto-play previous track
  }, [currentTrackIndex, playlist.length]);

  // Update current time and progress bar as audio plays
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime;
      setCurrentTime(newTime);
      if (progressBarRef.current) {
        progressBarRef.current.value = newTime;
      }
    }
  }, []);

  // Update duration when audio metadata loads
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const newDuration = audioRef.current.duration;
      setDuration(newDuration);
      if (progressBarRef.current) {
        progressBarRef.current.max = newDuration;
      }
    }
  }, []);

  // Handle seeking when user interacts with progress bar
  const handleProgressChange = (event) => {
    if (audioRef.current) {
      audioRef.current.currentTime = event.target.value;
      setCurrentTime(event.target.value); // Update state immediately for responsiveness
    }
  };

   // Handle volume change from slider
  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0); // Mute if volume is set to 0
  };

  // Toggle mute state
  const toggleMute = () => {
      setIsMuted(prev => !prev);
      // If unmuting and volume was 0, set a default volume
      if (!isMuted && volume === 0) {
          setVolume(0.5); // Set to 50% volume if unmuting from 0
      }
  };


  // Go to next track when current one ends
  const handleTrackEnd = useCallback(() => {
    playNextTrack();
  }, [playNextTrack]);

  // Handle image loading errors
  const handleImageError = useCallback((e) => {
    e.target.onerror = null; // Prevent infinite loops
    e.target.src = 'https://placehold.co/300x300/374151/e5e7eb?text=Image+N/A'; // Darker placeholder
  }, []);

   // Handle audio element errors
   const handleAudioError = useCallback((e) => {
     console.error("Erreur de l'élément audio:", e);
     const trackSrc = playlist[currentTrackIndex]?.mp3 || 'Inconnu';
     setError(`Erreur audio: Impossible de charger/lire ${trackSrc}. Vérifiez le fichier.`);
     setIsPlaying(false);
   }, [currentTrackIndex, playlist]);


  // --- Conditional Rendering ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-300">
        Chargement de la playlist...
      </div>
    );
  }

  // Display generic error first if it exists
  if (error && !playlist[currentTrackIndex]?.mp3) { // Show general error if critical (like no playlist)
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-900 text-white p-6 text-center">
          <h2 className="text-2xl font-bold mb-3">Erreur Critique</h2>
          <p>{error}</p>
          <p className="mt-4 text-sm">Vérifiez votre fichier `playlist.json` et la console du navigateur.</p>
        </div>
      );
  }

  // Handle case where playlist is loaded but empty
  if (playlist.length === 0 && !isLoading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-300 p-4 text-center">
        <h2 className="text-xl mb-2">Playlist Vide</h2>
        <p>Ajoutez des morceaux dans `/public/playlist.json` pour commencer.</p>
      </div>
    );
  }

  // --- Main Render ---

  const currentTrack = playlist[currentTrackIndex];
  // Provide default values if track is somehow undefined briefly
  const title = currentTrack?.title || 'Titre inconnu';
  const artist = currentTrack?.artist || 'Artiste inconnu';
  const imageUrl = currentTrack?.image || 'https://placehold.co/300x300/4b5563/e5e7eb?text=Musique';
  const audioSrc = currentTrack?.mp3;


  return (
    // Main container with a nicer gradient background
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white p-4 font-sans">
      {/* Audio element - remains hidden but functional */}
      <audio
        ref={audioRef}
        src={audioSrc}
        onEnded={handleTrackEnd}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleAudioError}
        // volume is controlled via state/effect
        // preload="metadata" // 'metadata' is usually enough and saves bandwidth
      />

      {/* Player card with glassmorphism effect (optional) and better padding */}
      <div className="w-full max-w-md bg-gray-800 bg-opacity-70 backdrop-filter backdrop-blur-lg shadow-xl rounded-xl p-6 md:p-8">

        {/* Album Art */}
        <div className="mb-5">
          <img
            key={currentTrackIndex} // Force re-render on track change
            src={imageUrl}
            alt={`Pochette pour ${title}`}
            className="w-full h-auto object-cover rounded-lg shadow-lg aspect-square transition-all duration-300 ease-in-out"
            onError={handleImageError}
          />
        </div>

        {/* Track Info - Improved typography */}
        <div className="text-center mb-5">
          <h2 className="text-2xl font-bold truncate hover:text-clip" title={title}>
            {title}
          </h2>
          <p className="text-base text-gray-400 truncate hover:text-clip" title={artist}>
            {artist}
          </p>
        </div>

        {/* Progress Bar - NEW */}
        <div className="mb-5">
           <input
            ref={progressBarRef}
            type="range"
            min="0"
            max={duration || 0} // Set max when duration is known
            value={currentTime}
            onChange={handleProgressChange} // Allow user seeking
            className="w-full h-2 bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Barre de progression"
            disabled={!audioSrc || duration === 0}
          />
          {/* Time Display */}
          <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>


        {/* Controls - Centered with adjusted spacing and improved button styles */}
        <div className="flex justify-between items-center">
           {/* Volume Control - NEW */}
           <div className="flex items-center space-x-2 w-1/4">
                <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors" aria-label={isMuted ? "Activer le son" : "Couper le son"}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                    aria-label="Contrôle du volume"
                 />
           </div>

          {/* Main Playback Controls */}
          <div className="flex items-center space-x-5">
              {/* Previous Button */}
              <button
                onClick={playPrevTrack}
                className="text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded-full"
                aria-label="Morceau précédent"
                disabled={playlist.length <= 1 || !audioSrc}
              >
                <SkipBack size={28} />
              </button>

              {/* Play/Pause Button - Enhanced style */}
              <button
                onClick={togglePlayPause}
                className={`bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${!audioSrc ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isPlaying ? 'Pause' : 'Lire'}
                disabled={!audioSrc}
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="relative left-[2px]" />} {/* Slight adjustment for Play icon centering */}
              </button>

              {/* Next Button */}
              <button
                onClick={playNextTrack}
                className="text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded-full"
                aria-label="Morceau suivant"
                disabled={playlist.length <= 1 || !audioSrc}
              >
                <SkipForward size={28} />
              </button>
          </div>

          {/* Placeholder for potential future controls (like shuffle/repeat) - keeps layout balanced */}
          <div className="w-1/4"></div>

        </div>

        {/* Audio Error Display (if occurs during playback) */}
        {error && audioSrc && ( // Only show playback errors here
          <p className="text-red-400 text-center text-xs mt-4 px-2">{error}</p>
        )}
      </div>

       {/* Optional Playlist Display (Uncomment to activate) */}
      {/*
      <div className="w-full max-w-md mt-6">
        <h3 className="text-lg font-semibold mb-2 text-center text-gray-300">Playlist</h3>
        <ul className="bg-gray-800 bg-opacity-70 backdrop-filter backdrop-blur-lg rounded-lg p-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
          {playlist.map((track, index) => (
            <li
              key={track.id || index} // Use a unique ID if available in playlist.json
              className={`p-2 my-1 rounded cursor-pointer flex justify-between items-center transition-colors duration-150 ${index === currentTrackIndex ? 'bg-indigo-600 bg-opacity-80 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
              onClick={() => {
                  setCurrentTrackIndex(index);
                  // Optional: Auto-play when clicking a track in the list
                  // setIsPlaying(true);
              }}
            >
              <span>{track.title || 'Titre inconnu'} - <span className="text-gray-400">{track.artist || 'Artiste inconnu'}</span></span>
              {index === currentTrackIndex && isPlaying && <Play size={16} className="animate-pulse text-green-400" />}
               {index === currentTrackIndex && !isPlaying && <Pause size={16} className="text-gray-500"/>}
            </li>
          ))}
        </ul>
      </div>
      */}
    </div>
  );
}
