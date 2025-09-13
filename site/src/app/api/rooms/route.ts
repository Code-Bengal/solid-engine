import { NextRequest, NextResponse } from 'next/server';
import { getRoomsFromSheets, getRoomById } from '@/lib/google-sheets';

// GET /api/rooms - Get all rooms
export async function GET() {
  try {
    const rooms = await getRoomsFromSheets();

    // Parse amenities string to array
    const roomsWithParsedAmenities = rooms.map(room => ({
      ...room,
      amenities: room.amenities ? room.amenities.split(',').map(a => a.trim()) : []
    }));

    return NextResponse.json(roomsWithParsedAmenities);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}


