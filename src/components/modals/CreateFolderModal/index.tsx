import { useState } from 'react';
import { Folder, Star, Briefcase, CreditCard, DollarSign, Home } from 'lucide-react';
import { Dialog, Flex, TextField, Button, Box } from '@radix-ui/themes';

interface CreateFolderModalProps {
  onConfirm: (folderData: any) => void;
  onCancel: () => void;
}

export default function CreateFolderModal({ onConfirm, onCancel }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');

  const icons = [
    { id: 'folder', Icon: Folder },
    { id: 'star', Icon: Star },
    { id: 'briefcase', Icon: Briefcase },
    { id: 'credit-card', Icon: CreditCard },
    { id: 'dollar', Icon: DollarSign },
    { id: 'home', Icon: Home },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      name: folderName,
      icon: selectedIcon,
    });
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content style={{ maxWidth: 380 }}>
        <Dialog.Title size="4">Create New Folder</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="2">
            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Folder Name *</span>
                <TextField.Root
                  size="1"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <Box>
              <Flex direction="column" gap="2">
                <span style={{ fontSize: '13px' }}>Icon</span>
                <Flex gap="2" wrap="wrap">
                  {icons.map(({ id, Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      variant={selectedIcon === id ? 'solid' : 'soft'}
                      onClick={() => setSelectedIcon(id)}
                      style={{ padding: '10px' }}
                    >
                      <Icon size={24} />
                    </Button>
                  ))}
                </Flex>
              </Flex>
            </Box>

            <Flex gap="2" mt="3" justify="end">
              <Dialog.Close>
                <Button size="1" variant="soft" color="gray" type="button">Cancel</Button>
              </Dialog.Close>
              <Button size="1" type="submit">Create</Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
