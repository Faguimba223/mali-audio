import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function App() {
  const [stats, setStats] = useState({
    users: 0,
    artists: 0,
    songs: 0,
    news: 0,
    releases: 0,
    languages: 0,
    totalListens: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersResponse, artistsResponse, songsResponse, newsResponse, releasesResponse, languagesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/users`),
          fetch(`${API_BASE_URL}/artists`),
          fetch(`${API_BASE_URL}/songs`),
          fetch(`${API_BASE_URL}/news`),
          fetch(`${API_BASE_URL}/new-releases`),
          fetch(`${API_BASE_URL}/languages`),
        ])

        const [users, artists, songs, news, releases, languages] = await Promise.all([
          usersResponse.json(),
          artistsResponse.json(),
          songsResponse.json(),
          newsResponse.json(),
          releasesResponse.json(),
          languagesResponse.json(),
        ])

        const totalListens = songs.reduce((total, song) => total + Number(song.play_count || 0), 0)

        setStats({
          users: Array.isArray(users) ? users.length : 0,
          artists: Array.isArray(artists) ? artists.length : 0,
          songs: Array.isArray(songs) ? songs.length : 0,
          news: Array.isArray(news) ? news.length : 0,
          releases: Array.isArray(releases) ? releases.length : 0,
          languages: Array.isArray(languages) ? languages.length : 0,
          totalListens,
        })
      } catch (error) {
        console.error('Erreur de chargement du dashboard admin', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const cards = useMemo(
    () => [
      { label: 'Utilisateurs', value: stats.users },
      { label: 'Artistes', value: stats.artists },
      { label: 'Musiques', value: stats.songs },
      { label: 'Actualités', value: stats.news },
      { label: 'Nouveautés', value: stats.releases },
      { label: 'Langues', value: stats.languages },
      { label: 'Écoutes', value: stats.totalListens },
    ],
    [stats],
  )

  return (
    <div className="admin-app">
      <aside className="sidebar">
        <div className="brand">Mali Audio</div>
        <nav>
          <a href="#">Dashboard</a>
          <a href="#">Utilisateurs</a>
          <a href="#">Artistes</a>
          <a href="#">Musiques</a>
          <a href="#">Actualités</a>
          <a href="#">Nouveautés</a>
          <a href="#">Langues</a>
          <a href="#">Catégories</a>
          <a href="#">Paramètres</a>
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Dashboard Mali Audio</h1>
          </div>
          <button type="button">Ajouter</button>
        </header>

        <section className="cards">
          {cards.map((card) => (
            <div key={card.label} className="stat-card">
              <span>{card.label}</span>
              <strong>{loading ? '…' : card.value}</strong>
            </div>
          ))}
        </section>

        <section className="panel-grid">
          <div className="panel">
            <h2>Vue d’ensemble</h2>
            <ul className="list">
              <li>Gestion des utilisateurs et activation</li>
              <li>Gestion des artistes, musiques et actualités</li>
              <li>Recherche sur les contenus et les langues</li>
              <li>Favoris, historique et statistiques</li>
            </ul>
          </div>

          <div className="panel">
            <h2>Actions rapides</h2>
            <div className="actions">
              <button type="button">Ajouter une musique</button>
              <button type="button">Ajouter un artiste</button>
              <button type="button">Ajouter une actualité</button>
              <button type="button">Ajouter une langue</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
