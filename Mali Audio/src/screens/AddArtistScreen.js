import AdminFormScreen from './AdminFormScreen';

export default function AddArtistScreen(props) {
  return <AdminFormScreen {...props} entity="artist" mode="add" record={props.routeParams?.record || null} />;
}