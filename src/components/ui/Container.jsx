export default function Container({ as: Tag = "div", className = "", children }) {
  return <Tag className={`container-app ${className}`}>{children}</Tag>;
}
