import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRooms } from '@/hooks/useRooms';
import { useBookings } from '@/hooks/useBookings';
import { RoomTypeEditor } from '@/components/dashboard/RoomTypeEditor';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Plus, BedDouble, Users, Edit, Wrench, Ban, CheckCircle2,
  AlertTriangle, Filter, DoorOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoomType, Room, RoomStatus } from '@/types';
import type { RoomTypeFormData, RoomFormData } from '@/lib/validators';
import { roomSchema } from '@/lib/validators';

const statusConfig: Record<RoomStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  available: { label: 'Available', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  occupied: { label: 'Occupied', color: 'text-teal', bg: 'bg-teal/10', border: 'border-teal/20', icon: Users },
  reserved: { label: 'Reserved', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2 },
  maintenance: { label: 'Maintenance', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Wrench },
  blocked: { label: 'Out of Service', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Ban },
};

export function RoomsPage() {
  const { roomTypes, rooms, isLoadingTypes, createRoomType, updateRoomType, updateRoom, createRoom } = useRooms();
  const { bookings } = useBookings();
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [showNewRoomType, setShowNewRoomType] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all');

  // Add Room form
  const roomForm = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: { room_number: '', floor: 1, status: 'available', notes: '' },
  });

  // Map room → current guest
  const roomGuestMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of bookings) {
      if (b.room_id && (b.status === 'checked_in' || b.status === 'confirmed')) {
        m[b.room_id] = `${b.guest?.first_name ?? ''} ${b.guest?.last_name ?? ''}`.trim();
      }
    }
    return m;
  }, [bookings]);

  // Helper: compute effective status (accounts for housekeeping/room status desync)
  const getEffectiveStatus = (room: Room): RoomStatus =>
    room.housekeeping_status === 'out_of_order' && room.status !== 'maintenance' && room.status !== 'blocked'
      ? 'maintenance'
      : room.status;

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: rooms.length };
    for (const r of rooms) {
      const eff = getEffectiveStatus(r);
      c[eff] = (c[eff] ?? 0) + 1;
    }
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  if (isLoadingTypes) return <PageSpinner />;

  const handleSubmit = (data: RoomTypeFormData) => {
    if (editingRoomType) {
      updateRoomType.mutate(
        { id: editingRoomType.id, ...data },
        { onSuccess: () => setEditingRoomType(null) },
      );
    } else {
      createRoomType.mutate(data, {
        onSuccess: () => setShowNewRoomType(false),
      });
    }
  };

  const handleSetStatus = (room: Room, newStatus: RoomStatus) => {
    // When moving to/from maintenance or blocked, the updateRoom mutation
    // automatically cascades housekeeping_status (out_of_order ↔ clean)
    updateRoom.mutate({
      id: room.id,
      room_type_id: room.room_type_id,
      room_number: room.room_number,
      floor: room.floor ?? 1,
      status: newStatus,
      notes: room.notes ?? undefined,
    });
  };

  const getRoomsByType = (typeId: string): Room[] =>
    rooms.filter((r) => r.room_type_id === typeId);

  const filteredRooms = statusFilter === 'all' ? rooms : rooms.filter((r) => getEffectiveStatus(r) === statusFilter);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Room Inventory</h1>
          <p className="text-sm text-steel font-body">
            {roomTypes.length} room types · {rooms.length} rooms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline-dark" onClick={() => setShowAddRoom(true)}>
            <DoorOpen size={16} className="mr-2" /> Add Room
          </Button>
          <Button onClick={() => setShowNewRoomType(true)}>
            <Plus size={16} className="mr-2" /> New Room Type
          </Button>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList variant="dark" className="mb-6">
          <TabsTrigger variant="dark" value="inventory">Room Status</TabsTrigger>
          <TabsTrigger variant="dark" value="types">Room Types</TabsTrigger>
        </TabsList>

        {/* Inventory Tab — now the default, with actions */}
        <TabsContent value="inventory">
          {/* Status filter bar */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <Filter size={14} className="text-steel mr-1" />
            {(['all', 'available', 'reserved', 'occupied', 'maintenance', 'blocked'] as const).map((status) => {
              const isActive = statusFilter === status;
              const config = status === 'all' ? null : statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all duration-200 border',
                    isActive
                      ? status === 'all'
                        ? 'bg-white/[0.1] border-white/[0.15] text-white'
                        : `${config!.bg} ${config!.border} ${config!.color}`
                      : 'bg-white/[0.03] border-white/[0.06] text-steel hover:text-silver hover:bg-white/[0.06]'
                  )}
                >
                  {status === 'all' ? 'All' : config!.label}
                  <span className="ml-1.5 opacity-60">{statusCounts[status] ?? 0}</span>
                </button>
              );
            })}
          </div>

          {/* Room cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const type = roomTypes.find((rt) => rt.id === room.room_type_id);
              // Effective status accounts for housekeeping desync
              const effectiveStatus = getEffectiveStatus(room);
              const sc = statusConfig[effectiveStatus];
              const StatusIcon = sc.icon;
              const guestName = roomGuestMap[room.id];

              return (
                <div key={room.id} className="glass-panel rounded-xl overflow-hidden transition-all duration-200 hover:shadow-card-hover">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm border',
                        sc.bg, sc.border, sc.color
                      )}>
                        {room.room_number}
                      </div>
                      <div>
                        <p className="text-sm font-body font-semibold text-white">{type?.name ?? 'Unknown'}</p>
                        <p className="text-[11px] text-steel font-body">
                          Floor {room.floor ?? '—'}
                          {room.housekeeping_status && (
                            <span className="ml-1.5 text-steel/60">· HK: {room.housekeeping_status}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-body font-semibold border',
                      sc.bg, sc.border, sc.color
                    )}>
                      <StatusIcon size={11} />
                      {sc.label}
                    </div>
                  </div>

                  {/* Guest info */}
                  {guestName && (
                    <div className="px-5 py-3 bg-white/[0.02] border-b border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold/30 to-teal/20 flex items-center justify-center text-[9px] font-bold text-white">
                          {guestName.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <p className="text-xs font-body text-silver">{guestName}</p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {room.notes && (
                    <div className="px-5 py-3.5 border-b border-white/[0.04]">
                      <p className="text-[11px] text-steel italic font-body">{room.notes}</p>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="px-5 py-4 flex flex-wrap gap-2">
                    {effectiveStatus !== 'maintenance' && effectiveStatus !== 'blocked' && room.status !== 'occupied' && (
                      <button
                        onClick={() => handleSetStatus(room, 'maintenance')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-body font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all duration-200"
                      >
                        <Wrench size={11} />
                        Maintenance
                      </button>
                    )}
                    {effectiveStatus !== 'blocked' && room.status !== 'occupied' && effectiveStatus !== 'maintenance' && (
                      <button
                        onClick={() => handleSetStatus(room, 'blocked')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-body font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200"
                      >
                        <Ban size={11} />
                        Out of Service
                      </button>
                    )}
                    {(effectiveStatus === 'maintenance' || effectiveStatus === 'blocked') && (
                      <button
                        onClick={() => handleSetStatus(room, 'available')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-body font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200"
                      >
                        <CheckCircle2 size={11} />
                        Return to Service
                      </button>
                    )}
                    {room.status === 'occupied' && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-body text-steel/50 bg-white/[0.02] border border-white/[0.04]">
                        <AlertTriangle size={11} />
                        Check out guest first
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Room Types Tab */}
        <TabsContent value="types">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {roomTypes.map((rt) => {
              const typeRooms = getRoomsByType(rt.id);
              const bedLabel = rt.bed_config?.[0]
                ? `${rt.bed_config[0].count}× ${rt.bed_config[0].type}`
                : 'N/A';
              return (
                <Card key={rt.id} variant="dark">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-white text-lg">{rt.name}</CardTitle>
                      <p className="text-steel text-xs font-body mt-1">{rt.description}</p>
                    </div>
                    <Button
                      variant="ghost-dark"
                      size="icon"
                      onClick={() => setEditingRoomType(rt)}
                      aria-label="Edit room type"
                    >
                      <Edit size={16} />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-steel">
                        <Users size={14} />
                        <span className="font-body">Max {rt.max_occupancy}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-steel">
                        <BedDouble size={14} />
                        <span className="font-body">{bedLabel}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {rt.amenities?.slice(0, 5).map((a) => (
                        <Badge key={a} variant="outline" className="text-xs">
                          {a}
                        </Badge>
                      ))}
                      {(rt.amenities?.length ?? 0) > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{(rt.amenities?.length ?? 0) - 5}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate/20">
                      <span className="text-steel text-xs font-body">
                        {typeRooms.length} room{typeRooms.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gold font-display text-lg">
                        £{rt.base_rate.toFixed(0)}<span className="text-xs text-steel font-body">/night</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Room Type Editor Dialog */}
      <Dialog
        open={showNewRoomType || !!editingRoomType}
        onOpenChange={() => { setShowNewRoomType(false); setEditingRoomType(null); }}
      >
        <DialogContent variant="dark" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRoomType ? 'Edit Room Type' : 'New Room Type'}
            </DialogTitle>
          </DialogHeader>
          <RoomTypeEditor
            roomType={editingRoomType || undefined}
            onSubmit={handleSubmit}
            isLoading={createRoomType.isPending || updateRoomType.isPending}
            onCancel={() => { setShowNewRoomType(false); setEditingRoomType(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog open={showAddRoom} onOpenChange={() => { setShowAddRoom(false); roomForm.reset(); }}>
        <DialogContent variant="dark" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Room</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={roomForm.handleSubmit((data) => {
              createRoom.mutate(data, {
                onSuccess: () => { setShowAddRoom(false); roomForm.reset(); },
              });
            })}
            className="space-y-4"
          >
            <div>
              <Label variant="dark">Room Type *</Label>
              <Select
                value={roomForm.watch('room_type_id') || ''}
                onValueChange={(v) => roomForm.setValue('room_type_id', v)}
              >
                <SelectTrigger variant="dark">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent variant="dark">
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>{rt.name} — £{rt.base_rate}/night</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roomForm.formState.errors.room_type_id && (
                <p className="text-xs text-danger mt-1">{roomForm.formState.errors.room_type_id.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label variant="dark">Room Number *</Label>
                <Input variant="dark" placeholder="e.g. 101" {...roomForm.register('room_number')} />
                {roomForm.formState.errors.room_number && (
                  <p className="text-xs text-danger mt-1">{roomForm.formState.errors.room_number.message}</p>
                )}
              </div>
              <div>
                <Label variant="dark">Floor</Label>
                <Input variant="dark" type="number" min={0} max={99} {...roomForm.register('floor', { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <Label variant="dark">Notes</Label>
              <Input variant="dark" placeholder="e.g. Sea view, corner room" {...roomForm.register('notes')} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost-dark" onClick={() => { setShowAddRoom(false); roomForm.reset(); }}>Cancel</Button>
              <Button type="submit" disabled={createRoom.isPending}>
                {createRoom.isPending ? 'Adding...' : 'Add Room'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
