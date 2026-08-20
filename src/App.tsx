import { AuthProvider } from "./features/auth/AuthProvider";
import { AuthenticatedApplication } from "./features/auth/AuthenticatedApplication";

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApplication />
    </AuthProvider>
  );
}
