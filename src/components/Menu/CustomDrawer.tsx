import Drawer from '@corvu/drawer';
import { type Component, type JSX } from 'solid-js';

interface CustomDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: JSX.Element;
  label?: string;
}

const CustomDrawer: Component<CustomDrawerProps> = (props) => {
  return (
    <Drawer 
      breakPoints={[0.75]} 
      open={props.open} 
      onOpenChange={props.onOpenChange}
      closeOnOutsidePointer={false}
    >
      {(drawerProps) => (
        <>
          <Drawer.Portal>
            {/* No overlay - MenuBar manages it */}
            <Drawer.Content class="fixed inset-x-0 top-[80px] bottom-0 z-50 flex h-full max-h-[calc(100vh-80px)] flex-col rounded-t-2xl border-t-4 border-corvu-400 bg-corvu-100 pt-3 transition-transform duration-700 ease-out after:absolute after:inset-x-0 after:top-full after:h-1/2 after:bg-inherit md:select-none">
              <div class="h-1 w-12 self-center rounded-full bg-corvu-400/50 mb-6" />

              <div class="px-6 space-y-8 overflow-y-auto pb-8">
                {props.label && (
                  <Drawer.Label class="text-2xl font-bold text-center text-corvu-text">
                    {props.label}
                  </Drawer.Label>
                )}
                {props.children}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </>
      )}
    </Drawer>
  );
};

export default CustomDrawer;
