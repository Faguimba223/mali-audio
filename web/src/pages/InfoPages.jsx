import { useEffect, useState } from 'react';
import logoImg from '../assets/mali-audio-logo.png';
import { Link } from '../context/RouterContext';
import { api } from '../services/api';

export function AboutPage() {
  return (
    <div className="panel" style={{ maxWidth: 820, margin: '0 auto' }}>
      <img src={logoImg} alt="Mali Audio" style={{ height: 70, marginBottom: 14 }} />
      <h1 style={{ marginTop: 0 }}>À propos de Mali Audio</h1>
      <p>
        Mali Audio est une plateforme numérique dédiée à la découverte, à la mise en valeur et à l’écoute en streaming des artistes, chansons, albums, clips et actualités de la scène musicale malienne et internationale.
      </p>
      <p style={{ color: 'var(--text-muted)' }}>
        Promoteur : Faguimba Traoré. Tous les contenus publiés sont validés et diffusés dans le respect des autorisations des ayants droit.
      </p>
    </div>
  );
}

export function ContactPage() {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    api.publicSettings().then((res) => setBranding(res?.branding || null)).catch(() => {});
  }, []);

  return (
    <div className="panel" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Contact & Support</h1>
      <p>Pour toute demande d’information, partenariat artistique, correction ou retrait de contenu :</p>
      <ul style={{ lineHeight: 2 }}>
        <li><strong>E-mail officiel :</strong> {branding?.contactEmail || 'contact@maliaudio.com'}</li>
        <li><strong>Téléphone :</strong> {branding?.contactPhone || '73611046'}</li>
      </ul>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="panel" style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Conditions d’utilisation</h1>
      <p>
        L’écoute des œuvres sur Mali Audio est réservée à un usage personnel et non commercial au sein du lecteur intégré. Toute extraction, redistribution ou téléchargement non autorisé des flux protégés est interdit.
      </p>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="panel" style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Politique de confidentialité</h1>
      <p>
        Mali Audio collecte uniquement les données nécessaires à la création et à la gestion de votre compte (nom public, adresse e-mail, favoris, playlists personnelles et, si activé, historique d’écoute).
      </p>
      <p style={{ color: 'var(--text-muted)' }}>
        Les mots de passe sont chiffrés via bcrypt et ne sont jamais stockés en clair. Vous pouvez effacer votre historique d’écoute ou désactiver votre compte à tout moment depuis votre page Profil.
      </p>
    </div>
  );
}

export function CopyrightPage() {
  return (
    <div className="panel" style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Droits d’auteur & Propriété intellectuelle</h1>
      <p>
        Les fichiers audio complets restent stockés dans un espace privé protégé et sont diffusés uniquement sur autorisation des artistes et ayants droit via des jetons temporaires.
      </p>
      <p style={{ color: 'var(--text-muted)' }}>
        Si vous êtes ayant droit et souhaitez signaler ou demander le retrait d’un contenu, contactez-nous via la page <Link to="/contact" style={{ color: 'var(--gold)' }}>Contact</Link>.
      </p>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="state-box" style={{ maxWidth: 540, margin: '30px auto' }}>
      <h1 style={{ marginTop: 0 }}>Page introuvable (404)</h1>
      <p>La page demandée n’existe pas ou a été déplacée.</p>
      <Link to="/" className="btn btn-primary">Retour à l’accueil</Link>
    </div>
  );
}
