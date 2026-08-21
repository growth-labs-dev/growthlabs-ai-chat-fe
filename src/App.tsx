import { AuthProvider } from "./features/auth/AuthProvider";
import { AuthenticatedApplication } from "./features/auth/AuthenticatedApplication";
import { LocaleProvider } from "./features/i18n/LocaleProvider";

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <AuthenticatedApplication />
      </LocaleProvider>
    </AuthProvider>
  );
}
