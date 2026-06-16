'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Clock, FileText, TrendingUp, ChevronRight, AlertCircle, Zap, User, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BottomNav } from '@/components/bottom-nav'
import { PayTypeBadge } from '@/components/pay-type-badge'
impor…(truncated)