import { Component, type ReactNode } from "react";
import { Button, Card } from "../components/ui.tsx";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.setState({ hasError: true });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="page">
          <Card>
            <h1>Terjadi gangguan pada halaman</h1>
            <p className="muted">
              Muat ulang halaman ini. Jika masih gagal, hubungi admin dan catat waktu kejadian.
            </p>
            <div className="button-row">
              <Button
                variant="primary"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
              >
                Muat ulang halaman
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
