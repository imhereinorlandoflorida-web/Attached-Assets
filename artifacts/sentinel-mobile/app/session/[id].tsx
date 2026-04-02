import { Feather } from "@expo/vector-icons";
import {
  useGetSession,
  useListPaths,
  useListSignals,
  useSubmitPathFeedback,
  useUpdateSession,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const CATEGORY_COLORS: Record<string, string> = {
  behavioral: "#0dd4f0",
  semantic: "#7e47eb",
  temporal: "#0080ff",
  contextual: "#10b981",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  paused: "#f59e0b",
  completed: "#6b7280",
};

export default function SessionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = parseInt(id, 10);

  const {
    data: session,
    isLoading: loadingSession,
    refetch: refetchSession,
  } = useGetSession(sessionId);
  const {
    data: signals,
    isLoading: loadingSignals,
    refetch: refetchSignals,
  } = useListSignals(sessionId);
  const {
    data: paths,
    isLoading: loadingPaths,
    refetch: refetchPaths,
  } = useListPaths(sessionId);

  const { mutate: updateSession } = useUpdateSession();
  const { mutate: submitFeedback } = useSubmitPathFeedback();

  const handleStatusChange = (newStatus: "active" | "paused" | "completed") => {
    Alert.alert(
      `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} Session`,
      `Are you sure you want to mark this session as ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            updateSession(
              { id: sessionId, data: { status: newStatus } },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  refetchSession();
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleFeedback = (pathId: number, score: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    submitFeedback(
      { id: sessionId, pathId, data: { score } },
      { onSuccess: () => refetchPaths() }
    );
  };

  const topPad = Platform.OS === "web" ? 67 : 0;

  if (loadingSession) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          Session not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const statusColor =
    STATUS_COLORS[session.status] ?? colors.mutedForeground;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text
            style={[styles.sessionName, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {session.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusColor + "22",
                borderColor: statusColor + "44",
              },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {session.status}
            </Text>
          </View>
        </View>

        {session.description && (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {session.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaStat}>
            <Feather name="zap" size={13} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {session.signalCount} signals
            </Text>
          </View>
          <View style={styles.metaStat}>
            <Feather name="git-branch" size={13} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {session.pathCount} paths
            </Text>
          </View>
          <View style={styles.metaStat}>
            <Feather name="bar-chart-2" size={13} color={colors.accent} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {(session.adaptationScore * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.adaptBar,
            { backgroundColor: colors.muted },
          ]}
        >
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
      </View>

      {session.status !== "completed" && (
        <View style={styles.controls}>
          {session.status === "active" ? (
            <Pressable
              onPress={() => handleStatusChange("paused")}
              style={[
                styles.controlBtn,
                {
                  backgroundColor: "#f59e0b22",
                  borderColor: "#f59e0b44",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name="pause" size={16} color="#f59e0b" />
              <Text style={[styles.controlText, { color: "#f59e0b" }]}>
                Pause
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => handleStatusChange("active")}
              style={[
                styles.controlBtn,
                {
                  backgroundColor: "#10b98122",
                  borderColor: "#10b98144",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name="play" size={16} color="#10b981" />
              <Text style={[styles.controlText, { color: "#10b981" }]}>
                Resume
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => handleStatusChange("completed")}
            style={[
              styles.controlBtn,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="check-circle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.controlText, { color: colors.mutedForeground }]}>
              Complete
            </Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Adaptive Paths
      </Text>
      {loadingPaths ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : paths && paths.length > 0 ? (
        paths.map((path) => (
          <View
            key={path.id}
            style={[
              styles.pathCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={styles.pathHeader}>
              <Text
                style={[styles.pathLabel, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {path.label}
              </Text>
              <Text
                style={[styles.pathConf, { color: colors.mutedForeground }]}
              >
                {(path.confidence * 100).toFixed(0)}% conf
              </Text>
            </View>
            {path.nodes.slice(0, 3).map((node, i) => (
              <View key={i} style={styles.nodeRow}>
                <View
                  style={[styles.nodeDot, { backgroundColor: colors.primary }]}
                />
                <Text
                  style={[styles.nodeText, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {node}
                </Text>
              </View>
            ))}
            <View style={styles.feedbackRow}>
              <Pressable
                onPress={() => handleFeedback(path.id, 1)}
                style={[
                  styles.feedbackBtn,
                  {
                    backgroundColor:
                      path.feedbackScore > 0
                        ? "#10b98133"
                        : colors.muted,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather
                  name="thumbs-up"
                  size={14}
                  color={
                    path.feedbackScore > 0 ? "#10b981" : colors.mutedForeground
                  }
                />
              </Pressable>
              <Pressable
                onPress={() => handleFeedback(path.id, -1)}
                style={[
                  styles.feedbackBtn,
                  {
                    backgroundColor:
                      path.feedbackScore < 0
                        ? "#f03c3c33"
                        : colors.muted,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather
                  name="thumbs-down"
                  size={14}
                  color={
                    path.feedbackScore < 0
                      ? colors.destructive
                      : colors.mutedForeground
                  }
                />
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No paths generated yet
        </Text>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Signals
      </Text>
      {loadingSignals ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : signals && signals.length > 0 ? (
        signals
          .slice()
          .reverse()
          .map((signal) => {
            const catColor =
              CATEGORY_COLORS[signal.category] ?? colors.primary;
            return (
              <View
                key={signal.id}
                style={[
                  styles.signalCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderLeftColor: catColor,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[styles.signalInput, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {signal.input}
                </Text>
                <View style={styles.signalMeta}>
                  <Text style={[styles.signalCat, { color: catColor }]}>
                    {signal.category}
                  </Text>
                  <Text
                    style={[
                      styles.signalStat,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    w: {signal.weight.toFixed(2)} · c: {signal.confidence.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })
      ) : (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No signals ingested yet
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  centered: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
  },
  errorText: { fontSize: 16 },
  backLink: { fontSize: 14 },
  header: { marginBottom: 20 },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sessionName: { fontSize: 22, fontWeight: "700" as const, flex: 1, marginRight: 12 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: "600" as const, textTransform: "uppercase" as const },
  description: { fontSize: 13, marginBottom: 12 },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 10 },
  metaStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12 },
  adaptBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  adaptFill: { height: "100%", borderRadius: 2 },
  controls: { flexDirection: "row", gap: 10, marginBottom: 24 },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
    borderWidth: 1,
  },
  controlText: { fontSize: 13, fontWeight: "500" as const },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  loader: { marginVertical: 16 },
  pathCard: { padding: 14, borderWidth: 1, marginBottom: 10 },
  pathHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pathLabel: { fontSize: 14, fontWeight: "600" as const, flex: 1 },
  pathConf: { fontSize: 11 },
  nodeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  nodeDot: { width: 5, height: 5, borderRadius: 3 },
  nodeText: { fontSize: 12, flex: 1 },
  feedbackRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  feedbackBtn: { padding: 8 },
  signalCard: {
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  signalInput: { fontSize: 13, marginBottom: 6 },
  signalMeta: { flexDirection: "row", justifyContent: "space-between" as const },
  signalCat: { fontSize: 11, fontWeight: "500" as const, textTransform: "capitalize" as const },
  signalStat: { fontSize: 11 },
  emptyText: { fontSize: 13, textAlign: "center" as const, marginVertical: 16 },
});
