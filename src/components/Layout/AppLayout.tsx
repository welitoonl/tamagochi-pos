import { ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings, BarChart3, Package, Users, ShoppingCart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/pos', icon: ShoppingCart, label: 'PDV', roles: ['ADMIN', 'GERENTE', 'FUNCIONARIO'] },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard', roles: ['ADMIN', 'GERENTE', 'FUNCIONARIO'] },
    { path: '/products', icon: Package, label: 'Produtos', roles: ['ADMIN', 'GERENTE'] },
    { path: '/sales', icon: Settings, label: 'Vendas', roles: ['ADMIN', 'GERENTE', 'FUNCIONARIO'] },
    { path: '/users', icon: Users, label: 'Usuários', roles: ['ADMIN'] },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PDV Tamagochii
            </h1>
            
            <nav className="flex space-x-1">
              {visibleMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">{user?.name}</span>
              <span className="text-muted-foreground">({user?.role})</span>
            </div>
            
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;