@@ .. @@
 import React from 'react';
 import { Link, useNavigate } from 'react-router-dom';
-import { Truck, LogOut, User } from 'lucide-react';
+import { Truck, LogOut, User, CreditCard } from 'lucide-react';
 import { useAuth } from '../hooks/useAuth';
+import { useSubscription } from '../hooks/useSubscription';
 
 export function Navigation() {
   const { user, signOut } = useAuth();
 }
+  const { getPlanName } = useSubscription();
   const navigate = useNavigate();
@@ .. @@
         <div className="flex items-center space-x-4">
           {user ? (
             <>
+              <Link
           )
           }
+                to="/pricing"
+                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
+              >
+                <CreditCard className="h-4 w-4" />
+                <span className="text-sm">
+                  {getPlanName() ? `${getPlanName()} Plan` : 'Pricing'}
+                </span>
+              </Link>
               <div className="flex items-center space-x-2 text-gray-600">
                 <User className="h-4 w-4" />
                 <span className="text-sm">{user.email}</span>