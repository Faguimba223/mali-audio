import AdminFormScreen from './AdminFormScreen';

export default function AddMusicScreen(props) {
  return <AdminFormScreen {...props} entity="music" mode="add" record={props.routeParams?.record || null} />;
}