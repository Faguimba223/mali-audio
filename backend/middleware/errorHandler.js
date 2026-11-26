import env from '../config/env.js';

export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const errorHandler = (err, _req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Le fichier dépasse la limite de taille autorisée.' });
  }
  if (err?.code === '23505') {
    return res.status(409).json({ message: 'Un enregistrement avec cet identifiant ou cette valeur unique existe déjà.' });
  }
  if (err?.code === '23503') {
    return res.status(400).json({ message: 'Référence invalide ou ressource liée introuvable.' });
  }

  const statusCode = err.status || err.statusCode || 500;
  if (statusCode >= 500) {
    console.error('[api] Error:', err);
  }

  return res.status(statusCode).json({
    message: statusCode >= 500 && env.isProduction
      ? 'Erreur interne du serveur.'
      : (err.message || 'Une erreur inconnue est survenue.'),
  });
};

export default errorHandler;
