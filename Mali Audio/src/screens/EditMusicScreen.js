import AdminFormScreen from './AdminFormScreen';

export default function EditMusicScreen(props) {
  return <AdminFormScreen {...props} entity="music" mode="edit" record={props.routeParams?.record || null} />;
}