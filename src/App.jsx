import React, { useState, useRef, useEffect, useCallback } from 'react';
// Importation des icônes nécessaires de lucide-react
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Shuffle, Repeat } from 'lucide-react';

// Fonction utilitaire pour formater le temps en MM:SS
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
  // États du composant
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // NOUVEAU: État pour le "like" (juste visuel pour l'instant)
  const [isLiked, setIsLiked] = useState(false);
  // NOUVEAU: États pour shuffle/repeat (juste visuel pour l'instant)
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'one', 'all'

  // Références aux éléments DOM
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  // --- Effets ---

  // Chargement de la playlist au montage
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
           setPlaylist([]);
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

  // Gestion lecture/pause audio
   useEffect(() => {
    if (!audioRef.current || playlist.length === 0) return;
    const audioElement = audioRef.current;
    if (isPlaying) {
      audioElement.play().catch(playError => {
        console.error("Erreur lors de la lecture:", playError);
        setError(`Erreur de lecture: ${playError.message}`);
        setIsPlaying(false);
      });
    } else {
      audioElement.pause();
    }
  }, [isPlaying, currentTrackIndex, playlist]);

   // Mise à jour du volume audio
   useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Mise à jour de la propriété 'loop' de l'élément audio pour le mode repeat 'one'
  useEffect(() => {
    if(audioRef.current) {
        audioRef.current.loop = repeatMode === 'one';
    }
  }, [repeatMode]);


  // --- Gestionnaires (Handlers) ---

  // Basculer Play/Pause
  const togglePlayPause = useCallback(() => {
    if (playlist.length === 0 || !playlist[currentTrackIndex]?.mp3) {
        setError("Aucun morceau à jouer ou fichier MP3 manquant.");
        return;
    };
    setIsPlaying(prev => !prev);
  }, [playlist, currentTrackIndex]);

  // Morceau Suivant (logique de base, sans shuffle/repeat pour l'instant)
  const handleNextTrackLogic = useCallback(() => {
    if (playlist.length === 0) return;

    if (isShuffle) {
        // Logique Shuffle : choisir un index aléatoire différent de l'actuel
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * playlist.length);
        } while (playlist.length > 1 && randomIndex === currentTrackIndex);
        setCurrentTrackIndex(randomIndex);
    } else {
        // Logique normale/repeat all
        const newIndex = (currentTrackIndex + 1) % playlist.length;
        setCurrentTrackIndex(newIndex);
    }

    // Reset time and keep playing state
    setCurrentTime(0);
    if (progressBarRef.current) progressBarRef.current.value = 0;
    // setIsPlaying(true); // Optionnel: forcer la lecture au changement

  }, [currentTrackIndex, playlist.length, isShuffle]);


  // Morceau Précédent (logique de base)
  const playPrevTrack = useCallback(() => {
    if (playlist.length === 0) return;
    // Si la lecture est > 3 secondes, redémarre le morceau actuel, sinon passe au précédent
    if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        if (progressBarRef.current) progressBarRef.current.value = 0;
    } else {
        const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        setCurrentTrackIndex(newIndex);
        setCurrentTime(0);
        if (progressBarRef.current) progressBarRef.current.value = 0;
    }
    // setIsPlaying(true); // Optionnel: forcer la lecture
  }, [currentTrackIndex, playlist.length]);

  // Mise à jour du temps courant pendant la lecture
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime;
      setCurrentTime(newTime);
      if (progressBarRef.current) {
        progressBarRef.current.value = newTime;
      }
    }
  }, []);

  // Mise à jour de la durée quand les métadonnées sont chargées
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const newDuration = audioRef.current.duration;
      setDuration(newDuration);
      if (progressBarRef.current) {
        progressBarRef.current.max = newDuration;
      }
    }
  }, []);

  // Gestion du déplacement dans la barre de progression
  const handleProgressChange = (event) => {
    if (audioRef.current) {
      audioRef.current.currentTime = event.target.value;
      setCurrentTime(event.target.value);
    }
  };

   // Gestion du changement de volume
  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Basculer Mute/Unmute
  const toggleMute = () => {
      setIsMuted(prev => !prev);
      if (!isMuted && volume === 0) {
          setVolume(0.5);
      }
  };

  // Gestion de la fin du morceau
  const handleTrackEnd = useCallback(() => {
    // Ne passe au suivant que si on n'est pas en mode repeat 'one'
    // (car si loop=true, l'événement 'ended' n'est pas censé se déclencher,
    // mais sécurité supplémentaire)
    if (repeatMode !== 'one') {
        handleNextTrackLogic();
    } else {
        // Si repeat 'one', on remet juste le temps à 0 et on continue la lecture
        // (normalement géré par l'attribut loop, mais au cas où)
        if (audioRef.current) audioRef.current.currentTime = 0;
        setIsPlaying(true); // Assure que ça continue de jouer
    }
  }, [handleNextTrackLogic, repeatMode]);


  // Gestion des erreurs de chargement d'image
  const handleImageError = useCallback((e) => {
    e.target.onerror = null;
    e.target.src = 'https://placehold.co/300x300/1a1a1a/4ade80?text=Image+N/A'; // Placeholder sombre avec texte vert
  }, []);

   // Gestion des erreurs de l'élément audio
   const handleAudioError = useCallback((e) => {
     console.error("Erreur de l'élément audio:", e);
     const trackSrc = playlist[currentTrackIndex]?.mp3 || 'Inconnu';
     setError(`Erreur audio: Impossible de charger/lire ${trackSrc}. Vérifiez le fichier.`);
     setIsPlaying(false);
   }, [currentTrackIndex, playlist]);

   // NOUVEAU: Basculer Like (juste visuel)
   const toggleLike = useCallback(() => {
       setIsLiked(prev => !prev);
       // Ici, on pourrait ajouter une logique pour sauvegarder l'état
   }, []);

   // NOUVEAU: Basculer Shuffle (juste visuel)
   const toggleShuffle = useCallback(() => {
       setIsShuffle(prev => !prev);
   }, []);

   // NOUVEAU: Changer le mode Repeat
   const cycleRepeatMode = useCallback(() => {
       setRepeatMode(prev => {
           if (prev === 'off') return 'all'; // ou 'context' si on gérait une playlist
           if (prev === 'all') return 'one';
           return 'off';
       });
   }, []);


  // --- Rendu Conditionnel ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-gray-400">
        Chargement...
      </div>
    );
  }

  if (error && !playlist[currentTrackIndex]?.mp3) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-900 text-white p-6 text-center">
          <h2 className="text-2xl font-bold mb-3">Erreur Critique</h2>
          <p>{error}</p>
          <p className="mt-4 text-sm">Vérifiez votre fichier `playlist.json` et la console.</p>
        </div>
      );
  }

  if (playlist.length === 0 && !isLoading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-gray-400 p-4 text-center">
        <h2 className="text-xl mb-2">Playlist Vide</h2>
        <p>Ajoutez des morceaux dans `/public/playlist.json`.</p>
      </div>
    );
  }

  // --- Rendu Principal ---

  const currentTrack = playlist[currentTrackIndex];
  const title = currentTrack?.title || 'Titre inconnu';
  const artist = currentTrack?.artist || 'Artiste inconnu';
  // Utilisation d'un placeholder plus adapté au thème
  const imageUrl = currentTrack?.image || 'https://placehold.co/300x300/1a1a1a/4ade80?text=Musique';
  const audioSrc = currentTrack?.mp3;

  // Classes Tailwind pour le mode repeat actif
  const repeatActiveClass = repeatMode !== 'off' ? 'text-green-500' : 'text-gray-400 hover:text-white';
  const shuffleActiveClass = isShuffle ? 'text-green-500' : 'text-gray-400 hover:text-white';


  return (
    // Conteneur principal avec fond noir
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 font-sans">
      {/* Élément Audio caché */}
      <audio
        ref={audioRef}
        src={audioSrc}
        onEnded={handleTrackEnd}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleAudioError}
        // loop={repeatMode === 'one'} // Géré via useEffect maintenant
      />

      {/* Carte du lecteur - Thème sombre, pas de transparence */}
      <div className="w-full max-w-md bg-gray-900 shadow-xl rounded-lg p-6 md:p-8">

        {/* Pochette d'album */}
        <div className="mb-6">
          <img
            key={currentTrackIndex}
            src={imageUrl}
            alt={`Pochette pour ${title}`}
            className="w-full h-auto object-cover rounded shadow-md aspect-square" // Ombre plus subtile, coins moins arrondis
            onError={handleImageError}
          />
        </div>

        {/* Informations et Bouton Like - Disposition ajustée */}
        <div className="flex justify-between items-center mb-4">
            <div className="text-left overflow-hidden mr-4">
              <h2 className="text-xl font-semibold truncate" title={title}>
                {title}
              </h2>
              <p className="text-sm text-gray-400 truncate" title={artist}>
                {artist}
              </p>
            </div>
            {/* Bouton Like (visuel) */}
            <button onClick={toggleLike} className="text-gray-400 hover:text-white focus:outline-none" aria-label="Aimer">
                <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-green-500' : ''} />
            </button>
        </div>


        {/* Barre de progression - Style vert */}
        <div className="mb-4">
           <input
            ref={progressBarRef}
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            // Style mis à jour pour correspondre au thème vert
            className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-500 hover:accent-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Barre de progression"
            disabled={!audioSrc || duration === 0}
          />
          {/* Affichage du temps */}
          <div className="flex justify-between text-xs text-gray-400 mt-1.5 px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>


        {/* Contrôles principaux - Disposition inspirée de la référence */}
        <div className="flex justify-between items-center mb-4">
            {/* Bouton Shuffle (visuel) */}
            <button onClick={toggleShuffle} className={`${shuffleActiveClass} focus:outline-none`} aria-label="Lecture aléatoire">
                <Shuffle size={20} />
            </button>

            {/* Bouton Précédent */}
            <button
              onClick={playPrevTrack}
              className="text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              aria-label="Morceau précédent"
              disabled={playlist.length <= 1 || !audioSrc}
            >
              <SkipBack size={28} fill="currentColor"/>
            </button>

            {/* Bouton Play/Pause - Style vert */}
            <button
              onClick={togglePlayPause}
              className={`bg-white text-black rounded-full p-3 shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none ${!audioSrc ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={isPlaying ? 'Pause' : 'Lire'}
              disabled={!audioSrc}
            >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="relative left-[2px]" />}
            </button>

            {/* Bouton Suivant */}
            <button
              onClick={handleNextTrackLogic} // Utilise la nouvelle logique
              className="text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              aria-label="Morceau suivant"
              disabled={playlist.length <= 1 || !audioSrc}
            >
              <SkipForward size={28} fill="currentColor"/>
            </button>

            {/* Bouton Repeat (visuel) */}
            <button onClick={cycleRepeatMode} className={`${repeatActiveClass} focus:outline-none relative`} aria-label="Répéter">
                <Repeat size={20} />
                {/* Indicateur pour 'repeat one' */}
                {repeatMode === 'one' && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-black text-[8px] font-bold w-3 h-3 flex items-center justify-center rounded-full">1</span>
                )}
            </button>
        </div>

        {/* Contrôle du Volume - Déplacé en bas */}
         <div className="flex items-center space-x-2">
            <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors" aria-label={isMuted ? "Activer le son" : "Couper le son"}>
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-500 hover:accent-green-400"
                aria-label="Contrôle du volume"
             />
       </div>


        {/* Affichage des erreurs */}
        {error && audioSrc && (
          <p className="text-red-500 text-center text-xs mt-4 px-2">{error}</p>
        )}
      </div>

       {/* Playlist Optionnelle (style à adapter si décommentée) */}
      {/* ... (code de la playlist ici, nécessiterait un style adapté au thème vert/noir) ... */}

    </div>
  );
}
