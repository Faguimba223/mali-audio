import AdminFormScreen from './AdminFormScreen';

export default function EditArtistScreen(props) {
  return <AdminFormScreen {...props} entity="artist" mode="edit" record={props.routeParams?.record || null} />;
}