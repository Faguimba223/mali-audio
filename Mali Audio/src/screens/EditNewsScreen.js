import AdminFormScreen from './AdminFormScreen';

export default function EditNewsScreen(props) {
  return <AdminFormScreen {...props} entity="news" mode="edit" record={props.routeParams?.record || null} />;
}