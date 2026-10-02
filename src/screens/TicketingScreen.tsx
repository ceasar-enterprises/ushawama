import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useOps, Ticket, TicketCategory, TicketPriority, TicketStatus } from '../ops';

const CATEGORIES: { id: TicketCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'customs', label: 'Customs' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'payment', label: 'Payment' },
  { id: 'warehouse', label: 'Warehouse' },
  { id: 'app', label: 'App' },
];

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

const STATUS_COLOR: Record<TicketStatus, string> = {
  open: Colors.warning,
  in_progress: Colors.accent,
  resolved: Colors.success,
  closed: Colors.textMuted,
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'OPEN',
  in_progress: 'IN PROGRESS',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  low: Colors.textMuted,
  medium: Colors.secondary,
  high: Colors.warning,
  urgent: Colors.error,
};

function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TicketCard({
  t,
  onChange,
}: {
  t: Ticket;
  onChange: (id: string, status: TicketStatus) => void;
}) {
  const color = STATUS_COLOR[t.status];
  return (
    <Card compact style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.ref}>{t.ref}</Text>
        <Text style={styles.time}>{timeAgo(t.updatedAt)}</Text>
      </View>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.desc}>{t.description}</Text>
      <View style={styles.metaRow}>
        <View style={[styles.chip, { backgroundColor: Colors.primary + '12' }]}>
          <Text style={[styles.chipText, { color: Colors.primary }]}>
            {t.category.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: PRIORITY_COLOR[t.priority] + '1c' }]}>
          <Text style={[styles.chipText, { color: PRIORITY_COLOR[t.priority] }]}>
            {t.priority.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: color + '22' }]}>
          <Text style={[styles.chipText, { color }]}>{STATUS_LABEL[t.status]}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {t.status === 'open' && (
          <Button title="Start" size="sm" onPress={() => onChange(t.id, 'in_progress')} />
        )}
        {t.status === 'in_progress' && (
          <Button title="Mark resolved" size="sm" variant="outline" onPress={() => onChange(t.id, 'resolved')} />
        )}
        {(t.status === 'resolved' || t.status === 'closed') && (
          <Button title="Reopen" size="sm" variant="ghost" onPress={() => onChange(t.id, 'in_progress')} />
        )}
      </View>
    </Card>
  );
}

export default function TicketingScreen() {
  const { tickets, createTicket, setTicketStatus } = useOps();
  const [filter, setFilter] = useState<TicketCategory | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('customs');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  const shown = filter === 'all' ? tickets : tickets.filter(t => t.category === filter);

  const submit = async () => {
    if (!title.trim()) return;
    await createTicket({ title, description, category, priority });
    setOpen(false);
    setTitle('');
    setDescription('');
    setCategory('customs');
    setPriority('medium');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.chips}>
          {CATEGORIES.map(c => {
            const active = filter === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(c.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {shown.length === 0 && (
          <Card compact variant="outlined">
            <Text style={styles.empty}>Nothing here. Raise a ticket and we will pick it up.</Text>
          </Card>
        )}
        {shown.map(t => (
          <TicketCard key={t.id} t={t} onChange={setTicketStatus} />
        ))}
      </ScrollView>

      <View style={styles.fabWrap}>
        <Button title="New ticket" onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Raise a ticket</Text>

            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cargo not cleared at Busia"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {(['customs', 'delivery', 'payment', 'warehouse', 'app'] as TicketCategory[]).map(c => {
                const active = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setCategory(c)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.chips}>
              {PRIORITIES.map(p => {
                const active = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What happened? Where? Any reference numbers..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setOpen(false)} />
              <Button title="Submit ticket" onPress={submit} disabled={!title.trim()} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 90 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textOnPrimary },

  card: { marginTop: Spacing.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  time: { fontSize: FontSize.xs, color: Colors.textMuted },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.xs },
  desc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 19 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  chipMini: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  chipTextMini: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.4 },
  actions: { flexDirection: 'row', marginTop: Spacing.md },

  empty: { fontSize: FontSize.sm, color: Colors.textSecondary },

  fabWrap: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,30,22,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xl },
});