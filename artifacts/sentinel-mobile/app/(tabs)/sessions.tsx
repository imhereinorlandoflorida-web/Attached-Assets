import { Feather } from "@expo/vector-icons";
import {
  useCreateSession,
  useListSessions,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  paused: "#f59e0b",
  completed: "#6b7280",
};

function SessionCard({
  session,
  onPress,
}: {
  session: {
    id: number;
    name: string;
    status: string;
    signalCount: number;
    pathCount: number;
    adaptationScore: number;
    updatedAt: string;
  };
  onPress: () => void;
}) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[session.status] ?? colors.mutedForeground;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text
          style={[styles.cardName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {session.name}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + "22", borderColor: statusColor + "44" },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {session.status}
          </Text>
        </View>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.cardStat}>
          <Feather name="zap" size={12} color={colors.primary} />
          <Text style={[styles.cardStatText, { color: colors.mutedForeground }]}>
            {session.signalCount} signals
          </Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="git-branch" size={12} color={colors.secondary} />
          <Text style={[styles.cardStatText, { color: colors.mutedForeground }]}>
            {session.pathCount} paths
          </Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="bar-chart-2" size={12} color={colors.accent} />
          <Text style={[styles.cardStatText, { color: colors.mutedForeground }]}>
            {(session.adaptationScore * 100).toFixed(0)}% adapted
          </Text>
        </View>
      </View>

      <View style={styles.adaptBar}>
        <View
          style={[
            styles.adaptFill,
            {
              backgroundColor: colors.primary,
              width: `${Math.round(session.adaptationScore * 100)}%` as any,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

export default function SessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: sessions, isLoading, refetch } = useListSessions();
  const { mutate: createSession, isPending } = useCreateSession();

  const handleCreate = () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Session name is required");
      return;
    }
    createSession(
      { name: newName.trim(), description: newDesc.trim() || undefined },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowCreate(false);
          setNewName("");
          setNewDesc("");
          refetch();
        },
        onError: () => {
          Alert.alert("Error", "Failed to create session");
        },
      }
    );
  };

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sessions ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: topPad + 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
          },
        ]}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/session/${item.id}`);
            }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Feather name="cpu" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No sessions
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Tap + to initialize a new sequence
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <Text style={[styles.heading, { color: colors.foreground }]}>
            Sessions
          </Text>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        scrollEnabled={true}
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreate(true);
        }}
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + (Platform.OS === "web" ? 34 + 50 : 90),
          },
        ]}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </Pressable>

      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCreate(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Initialize Sequence
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                },
              ]}
              placeholder="Session identifier"
              placeholderTextColor={colors.mutedForeground}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                  height: 80,
                },
              ]}
              placeholder="Context / parameters (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
            />
            <Pressable
              onPress={handleCreate}
              disabled={isPending}
              style={({ pressed }) => [
                styles.createBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed || isPending ? 0.7 : 1,
                },
              ]}
            >
              {isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={[styles.createBtnText, { color: colors.primaryForeground }]}
                >
                  Initialize
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16 },
  heading: { fontSize: 26, fontWeight: "700" as const, marginBottom: 16 },
  card: { padding: 14, borderWidth: 1 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardName: { fontSize: 15, fontWeight: "600" as const, flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: "600" as const, textTransform: "uppercase" as const },
  cardStats: { flexDirection: "row", gap: 12, marginBottom: 10 },
  cardStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardStatText: { fontSize: 11 },
  adaptBar: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 1,
    overflow: "hidden",
  },
  adaptFill: { height: "100%", borderRadius: 1 },
  separator: { height: 10 },
  emptyState: { alignItems: "center" as const, paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const },
  emptyDesc: { fontSize: 13, textAlign: "center" as const },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center" as const,
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" as const },
  input: { borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: "top" as const },
  createBtn: { padding: 14, alignItems: "center" as const },
  createBtnText: { fontSize: 15, fontWeight: "600" as const },
});
