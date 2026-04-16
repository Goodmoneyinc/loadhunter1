@@ .. @@
 import { LoadForm } from '../components/LoadForm';
 import { LoadList } from '../components/LoadList';
 import { DriverList } from '../components/DriverList';
+import { SubscriptionStatus } from '../components/SubscriptionStatus';
 import { useAuth } from '../hooks/useAuth';
 import { useDrivers } from '../hooks/useDrivers';
@@ .. @@
   return (
     <div className="min-h-screen bg-gray-50">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
+        <SubscriptionStatus />
+        
         <div className="flex justify-between items-center mb-8">
           <div>
   )