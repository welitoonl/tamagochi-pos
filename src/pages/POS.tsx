import { useState, useEffect, useRef } from 'react';
import { usePosStore } from '@/stores/posStore';
import { useAuthStore } from '@/stores/authStore';
import { PosButton } from '@/components/ui/pos-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  DollarSign, 
  Wifi, 
  WifiOff,
  ShoppingCart,
  Package,
  Clock
} from 'lucide-react';
import { Product } from '@/types';
import { format } from 'date-fns';

const POS = () => {
  const [scanInput, setScanInput] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  
  const {
    cart,
    total,
    paymentMethod,
    isOnline,
    lastSync,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setPaymentMethod,
    finalizeSale,
    findProductByBarcode,
    searchProducts
  } = usePosStore();
  
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Keep scan input focused
  useEffect(() => {
    const focusInput = () => {
      if (scanInputRef.current && !showSearchModal) {
        scanInputRef.current.focus();
      }
    };
    
    focusInput();
    window.addEventListener('focus', focusInput);
    
    return () => window.removeEventListener('focus', focusInput);
  }, [showSearchModal]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target !== scanInputRef.current) {
        return; // Don't interfere with other inputs
      }
      
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          setShowSearchModal(true);
          break;
        case 'F4':
          e.preventDefault();
          handleFinalizeSale();
          break;
        case 'Escape':
          e.preventDefault();
          setShowSearchModal(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleScan = (barcode: string) => {
    if (!barcode.trim()) return;
    
    const product = findProductByBarcode(barcode);
    if (product) {
      addToCart(product);
      setScanInput('');
      
      // Success feedback
      toast({
        title: "Produto adicionado!",
        description: `${product.name} - R$ ${product.price.toFixed(2)}`,
        duration: 2000,
      });
    } else {
      setShowSearchModal(true);
      setSearchQuery(barcode);
      setScanInput('');
      
      toast({
        title: "Produto não encontrado",
        description: "Use a busca para encontrar o produto",
        variant: "destructive"
      });
    }
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos para finalizar a venda",
        variant: "destructive"
      });
      return;
    }

    const sale = finalizeSale();
    if (sale) {
      toast({
        title: "Venda finalizada!",
        description: `Total: R$ ${sale.total.toFixed(2)} - ${sale.paymentMethod}`,
      });
      
      // Focus back to scan input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  };

  const searchResults = searchProducts(searchQuery);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-140px)]">
      {/* Header Controls */}
      <div className="lg:col-span-5 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex-1 max-w-md">
            <Input
              ref={scanInputRef}
              placeholder="Escaneie ou digite o código de barras..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleScan(scanInput);
                }
              }}
              className="text-lg h-12"
            />
          </div>
          
          <PosButton
            variant="outline"
            size="pos"
            onClick={() => setShowSearchModal(true)}
          >
            <Search className="h-5 w-5 mr-2" />
            Buscar (F2)
          </PosButton>
          
          <PosButton
            variant="success"
            size="pos"
            onClick={handleFinalizeSale}
            disabled={cart.length === 0}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Finalizar (F4)
          </PosButton>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={isOnline ? "success" : "destructive"} className="flex items-center space-x-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </Badge>
          
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Sync: {format(lastSync, 'HH:mm:ss')}
            </span>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Carrinho ({cart.length} itens)</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Carrinho vazio</p>
                  <p className="text-sm">Escaneie um produto para começar</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.product.sku} | R$ {item.product.price.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="h-8 w-8"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="h-8 w-8"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium">R$ {item.subtotal.toFixed(2)}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.product.id)}
                        className="h-6 w-6 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Totals & Payment Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Total da Venda</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                R$ {total.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {cart.length} {cart.length === 1 ? 'item' : 'itens'}
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <p className="font-medium">Forma de Pagamento:</p>
              <div className="grid grid-cols-2 gap-2">
                <PosButton
                  variant={paymentMethod === 'DINHEIRO' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('DINHEIRO')}
                  className="flex items-center space-x-2"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Dinheiro</span>
                </PosButton>
                
                <PosButton
                  variant={paymentMethod === 'CARTAO' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('CARTAO')}
                  className="flex items-center space-x-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Cartão</span>
                </PosButton>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <PosButton
                variant="success"
                size="lg"
                onClick={handleFinalizeSale}
                disabled={cart.length === 0}
                className="w-full"
              >
                Finalizar Venda (F4)
              </PosButton>
              
              <Button
                variant="outline"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="w-full"
              >
                Limpar Carrinho
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Operator Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Operador: {user?.name}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSearchModal(false)}>
          <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Buscar Produto</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Input
                placeholder="Digite o nome, SKU ou código de barras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      addToCart(product);
                      setShowSearchModal(false);
                      setSearchQuery('');
                    }}
                  >
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        SKU: {product.sku} | Estoque: {product.stock}
                      </p>
                    </div>
                    <p className="font-medium">R$ {product.price.toFixed(2)}</p>
                  </div>
                ))}
                
                {searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum produto encontrado
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowSearchModal(false)}>
                  Cancelar (ESC)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default POS;
