"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"

export function FeaturedProperty() {
  return (
    <div className="bg-navy rounded-2xl overflow-hidden shadow-lg">
      <div className="p-6 pb-4 flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <p className="text-xs text-primary font-medium tracking-wider uppercase mb-2">
            Promoted Property
          </p>
          <h3 className="text-2xl lg:text-3xl font-serif text-navy-foreground leading-tight mb-4">
            The Glass Pavilion in West Village
          </h3>
          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-[10px] text-navy-foreground/60 uppercase tracking-wider">Avg stay</p>
              <p className="text-xl font-bold text-navy-foreground">+22%</p>
            </div>
            <div>
              <p className="text-[10px] text-navy-foreground/60 uppercase tracking-wider">Avg stay</p>
              <p className="text-xl font-bold text-navy-foreground">9.4 Mo.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 py-2 h-auto">
              Manage Unit
            </Button>
            <Button 
              variant="outline" 
              className="border-navy-foreground/30 text-navy-foreground hover:bg-navy-foreground/10 text-xs px-4 py-2 h-auto"
            >
              Unit Analytics
            </Button>
          </div>
        </div>
        <div className="lg:w-64 h-48 lg:h-auto relative rounded-xl overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop"
            alt="The Glass Pavilion interior"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  )
}
