import AdminFormScreen from './AdminFormScreen';

export default function AddNewsScreen(props) {
  return <AdminFormScreen {...props} entity="news" mode="add" record={props.routeParams?.record || null} />;
}