import AdminCatalogManager from '../components/AdminCatalogManager';

export default function AdminArtistScreen(props) {
  return <AdminCatalogManager {...props} kind="artist" />;
}