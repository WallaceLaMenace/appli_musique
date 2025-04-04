import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';


// Composant principal de l'application
export default function App() {
  // State pour stocker la playlist chargée depuis playlist.json
  const [playlist, setPlaylist] = useState([]);
  // State pour l'index du morceau actuel dans la playlist
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  // State pour savoir si la musique est en cours de lecture
  const [isPlaying, setIsPlaying] = useState(false);
  // State pour gérer les erreurs de chargement
  const [error, setError] = useState(null);
  // State pour indiquer si les données sont en cours de chargement
  const [isLoading, setIsLoading] = useState(true);

  // Référence à l'élément audio HTML pour le contrôler
  const audioRef = useRef(null);

  // Effet pour charger la playlist au montage du composant
  useEffect(() => {
    fetch('/playlist.json') // Chemin relatif au dossier public
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - Vérifiez que /public/playlist.json existe et est correct.`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          setPlaylist(data);
        } else {
          throw new Error("La playlist est vide ou le format est incorrect.");
        }
        setIsLoading(false);
      })
      .catch(fetchError => {
        console.error("Erreur lors du chargement de la playlist:", fetchError);
        setError(`Impossible de charger la playlist. Vérifiez le fichier /public/playlist.json et la console pour plus de détails. Erreur: ${fetchError.message}`);
        setIsLoading(false);
      });
  }, []); // Le tableau vide signifie que cet effet ne s'exécute qu'une fois au montage

  // Effet pour gérer la lecture/pause quand l'état isPlaying change ou quand la piste change
  useEffect(() => {
    if (!audioRef.current || playlist.length === 0) return; // Ne rien faire si l'audio n'est pas prêt ou playlist vide

    if (isPlaying) {
      audioRef.current.play().catch(playError => {
        console.error("Erreur lors de la lecture audio:", playError);
        // Optionnel: Remettre isPlaying à false si la lecture échoue
        // setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
    // Pas besoin de dépendance sur isPlaying ici si on gère via les fonctions play/pause
    // Mais on veut recharger si la source change (currentTrackIndex)
  }, [isPlaying, currentTrackIndex, playlist]); // Réagit aux changements de isPlaying et currentTrackIndex

  // Fonction pour lancer/mettre en pause la lecture
  const togglePlayPause = () => {
    if (playlist.length === 0) return; // Ne rien faire si playlist vide
    setIsPlaying(!isPlaying);
  };

  // Fonction pour passer au morceau suivant
  const playNextTrack = () => {
    if (playlist.length === 0) return; // Ne rien faire si playlist vide
    const newIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(newIndex);
    // Optionnel: redémarrer la lecture automatiquement au changement de piste
    // setIsPlaying(true);
  };

  // Fonction pour passer au morceau précédent
  const playPrevTrack = () => {
    if (playlist.length === 0) return; // Ne rien faire si playlist vide
    const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(newIndex);
    // Optionnel: redémarrer la lecture automatiquement au changement de piste
    // setIsPlaying(true);
  };

  // Gestionnaire pour la fin d'un morceau (passe au suivant)
  const handleTrackEnd = () => {
    playNextTrack();
  };

  // Gestionnaire pour les erreurs de chargement de l'image
  const handleImageError = (e) => {
    // Remplace l'image par une image par défaut si elle ne charge pas
    e.target.onerror = null; // Empêche une boucle infinie si l'image par défaut échoue aussi
    e.target.src = 'https://placehold.co/300x300/2d3748/e2e8f0?text=Image+N/A'; // Image placeholder
  };

  // --- Rendu du Composant ---

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Chargement de la playlist...
      </div>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-900 text-white p-4">
        <h2 className="text-xl font-bold mb-2">Erreur</h2>
        <p className="text-center">{error}</p>
        <p className="mt-4 text-sm">Vérifiez que le fichier `/public/playlist.json` existe, qu'il est correctement formaté (JSON valide) et que les chemins vers les fichiers MP3 et images sont corrects.</p>
      </div>
    );
  }

  // Affichage si la playlist est chargée mais vide
  if (playlist.length === 0 && !isLoading) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <p>La playlist est vide. Ajoutez des morceaux dans `/public/playlist.json`.</p>
      </div>
    );
  }

  // Récupération des informations du morceau actuel
  const currentTrack = playlist[currentTrackIndex];
  // Utilisation d'une image placeholder si le chemin est manquant ou vide
  const imageUrl = currentTrack?.image || 'https://placehold.co/300x300/2d3748/e2e8f0?text=Musique';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 font-sans">
      {/* Lecteur Audio HTML (caché visuellement mais fonctionnel) */}
      <audio
        ref={audioRef}
        src={currentTrack?.mp3} // La source change quand currentTrackIndex change
        onEnded={handleTrackEnd} // Gère la fin du morceau
        // preload="auto" // Peut aider à charger plus vite, mais consomme de la bande passante
        onError={(e) => {
            console.error("Erreur de l'élément audio:", e);
            setError(`Impossible de charger ou lire le fichier audio : ${currentTrack?.mp3 || 'Inconnu'}. Vérifiez le chemin et le fichier.`);
            setIsPlaying(false); // Arrête la tentative de lecture en cas d'erreur
        }}
      />

      <div className="w-full max-w-md bg-gray-800 shadow-lg rounded-lg p-6">
        {/* Image de l'album */}
        <div className="mb-6">
          <img
            // Utilise l'index comme clé pour forcer le re-rendu si l'URL est la même mais doit être rechargée
            key={currentTrackIndex}
            src={imageUrl}
            alt={`Pochette pour ${currentTrack?.title || 'morceau inconnu'}`}
            className="w-full h-auto object-cover rounded-md aspect-square shadow-md"
            onError={handleImageError} // Gestion de l'erreur de chargement d'image
          />
        </div>

        {/* Informations sur le morceau */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold truncate" title={currentTrack?.title || 'Titre inconnu'}>
            {currentTrack?.title || 'Titre inconnu'}
          </h2>
          <p className="text-gray-400 truncate" title={currentTrack?.artist || 'Artiste inconnu'}>
            {currentTrack?.artist || 'Artiste inconnu'}
          </p>
        </div>

        {/* Contrôles de lecture */}
        <div className="flex justify-center items-center space-x-6">
          {/* Bouton Précédent */}
          <button
            onClick={playPrevTrack}
            className="text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50"
            aria-label="Morceau précédent"
            disabled={playlist.length <= 1} // Désactivé si 1 seul morceau
          >
            <SkipBack size={28} />
          </button>

          {/* Bouton Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="bg-green-500 hover:bg-green-400 text-black rounded-full p-3 shadow-lg transition-transform duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isPlaying ? 'Pause' : 'Lire'}
            disabled={!currentTrack?.mp3} // Désactivé si pas de source MP3
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
          </button>

          {/* Bouton Suivant */}
          <button
            onClick={playNextTrack}
            className="text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50"
            aria-label="Morceau suivant"
            disabled={playlist.length <= 1} // Désactivé si 1 seul morceau
          >
            <SkipForward size={28} />
          </button>
        </div>
         {/* Affichage de l'erreur audio si elle survient pendant l'utilisation */}
         {error && !isLoading && (
            <p className="text-red-400 text-center text-sm mt-4">{error}</p>
         )}
      </div>

      {/* Optionnel : Afficher la playlist (décommenter pour l'activer) */}
      {/*
      <div className="w-full max-w-md mt-6">
        <h3 className="text-lg font-semibold mb-2 text-center">Playlist</h3>
        <ul className="bg-gray-800 rounded-lg p-2 max-h-40 overflow-y-auto">
          {playlist.map((track, index) => (
            <li
              key={track.id || index}
              className={`p-2 rounded cursor-pointer ${index === currentTrackIndex ? 'bg-green-700' : 'hover:bg-gray-700'}`}
              onClick={() => setCurrentTrackIndex(index)}
            >
              {track.title} - <span className="text-gray-400">{track.artist}</span>
            </li>
          ))}
        </ul>
      </div>
      */}
    </div>
  );
}
