import { Dialog, Flex, TextField, Button, TextArea, Select, Box } from '@radix-ui/themes';
import { KeyRound } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { foldersAtom } from '@/store/atoms';
import PasswordGenerator from '@/components/PasswordGenerator';
import { useCreatePassword } from '@/hooks/useCreatePassword';
import { Password } from '@/types';

interface CreatePasswordModalProps {
  onConfirm: (passwordData: any) => void;
  onCancel: () => void;
  initialPassword?: string;
  initialData?: Password;
}

export default function CreatePasswordModal({ onConfirm, onCancel, initialPassword = '', initialData }: CreatePasswordModalProps) {
  const {
    serviceName,
    username,
    password,
    url,
    notes,
    folder,
    showGenerator,
    setServiceName,
    setUsername,
    setPassword,
    setUrl,
    setNotes,
    setFolder,
    setShowGenerator,
    handleUseGeneratedPassword,
    handleSubmit,
  } = useCreatePassword({ onConfirm, onCancel, initialPassword, initialData });

  const folders = useAtomValue(foldersAtom);

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content style={{ maxWidth: 380, maxHeight: '85vh', overflow: 'auto' }}>
        <Dialog.Title size="4">{initialData ? 'Edit Password' : 'Create New Password'}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="2">
            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Service Name *</span>
                <TextField.Root
                  size="1"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Username *</span>
                <TextField.Root
                  size="1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Password *</span>
                <Flex gap="2">
                  <TextField.Root
                    size="1"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <Button size="1" type="button" variant="soft" color="violet" onClick={() => setShowGenerator(!showGenerator)}>
                    <KeyRound size={14} />
                    {showGenerator ? 'Hide' : 'Generate'}
                  </Button>
                </Flex>
              </Flex>
            </label>

            {showGenerator && (
              <Box style={{ border: '1px solid var(--blue-6)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--blue-2)' }}>
                <PasswordGenerator
                  onUsePassword={handleUseGeneratedPassword}
                  onCancel={() => setShowGenerator(false)}
                  isEmbedded
                />
              </Box>
            )}

            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>URL</span>
                <TextField.Root
                  size="1"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Select folder...</span>
                <Select.Root value={folder} onValueChange={setFolder} size="1">
                  <Select.Trigger placeholder="Select folder..." />
                  <Select.Content>
                    {folders.map((f) => (
                      <Select.Item key={f.id} value={f.id}>{f.name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Notes</span>
                <TextArea
                  size="1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </Flex>
            </label>

            <Flex gap="2" mt="3" justify="end">
              <Dialog.Close>
                <Button size="1" variant="soft" color="gray" type="button">Cancel</Button>
              </Dialog.Close>
              <Button size="1" type="submit">Save</Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
